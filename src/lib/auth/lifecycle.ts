import crypto from "crypto";
import prisma from "@/lib/prisma";
import { comparePassword, validatePasswordStrength } from "@/lib/auth/password";
import {
  mergeRoles,
  type AppRole,
} from "@/lib/auth/roles";
import { sendTwoFactorTokenEmail } from "@/lib/email";

export type AuthLifecycleSnapshot = {
  id: string;
  email: string | null;
  name: string | null;
  password: string | null;
  role: AppRole;
  roles: AppRole[];
  image: string | null;
  onboardingCompleted: boolean;
  providerSetupCompleted: boolean;
  preferredWorkspace: string | null;
  clientInterests: string[];
  emailVerified: Date | null;
  isBanned: boolean;
  isTwoFactorEnabled: boolean;
  deletionScheduledAt: Date | null;
  authInvalidatedAt: Date | null;
};

export type CredentialsAuthResult =
  | { status: "invalid"; message: string }
  | { status: "email-unverified"; message: string }
  | { status: "banned"; message: string }
  | { status: "two-factor-required"; message: string }
  | { status: "two-factor-invalid"; message: string }
  | { status: "two-factor-expired"; message: string }
  | { status: "success"; user: AuthLifecycleSnapshot };

export async function getAuthUserByEmail(
  email?: string | null,
): Promise<AuthLifecycleSnapshot | null> {
  if (!email) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
      roles: true,
      image: true,
      onboardingCompleted: true,
      providerSetupCompleted: true,
      preferredWorkspace: true,
      clientInterests: true,
      emailVerified: true,
      isBanned: true,
      isTwoFactorEnabled: true,
      deletionScheduledAt: true,
      authInvalidatedAt: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    ...user,
    roles: mergeRoles(user.roles, user.role),
  };
}

export function getSettingsPathForRole(role?: string | null): string {
  return role === "PROVIDER" ? "/dashboard/settings" : "/client/settings";
}

export function getAccountLifecycleError(
  user: Pick<AuthLifecycleSnapshot, "isBanned">,
): string | null {
  if (user.isBanned) {
    return "This account has been suspended. Please contact support.";
  }

  return null;
}

export function getPendingDeletionRedirect(
  role?: string | null,
  currentSearch?: URLSearchParams,
): string {
  const params = new URLSearchParams(currentSearch);
  params.set("tab", "account");
  params.set("deletion", "pending");

  return `${getSettingsPathForRole(role)}?${params.toString()}`;
}

export function buildAuthSessionUser(
  user: AuthLifecycleSnapshot,
): Omit<AuthLifecycleSnapshot, "password"> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roles: mergeRoles(user.roles, user.role),
    image: user.image,
    onboardingCompleted: user.onboardingCompleted,
    providerSetupCompleted: user.providerSetupCompleted,
    preferredWorkspace: user.preferredWorkspace,
    clientInterests: user.clientInterests,
    emailVerified: user.emailVerified,
    isBanned: user.isBanned,
    isTwoFactorEnabled: user.isTwoFactorEnabled,
    deletionScheduledAt: user.deletionScheduledAt,
    authInvalidatedAt: user.authInvalidatedAt,
  };
}

async function issueTwoFactorToken(user: AuthLifecycleSnapshot): Promise<void> {
  if (!user.email) {
    throw new Error("Two-factor email delivery is unavailable for this user");
  }

  await prisma.twoFactorConfirmation.deleteMany({
    where: { userId: user.id },
  });

  const token = crypto.randomInt(100000, 999999).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.twoFactorToken.deleteMany({
    where: { email: user.email },
  });

  await prisma.twoFactorToken.create({
    data: {
      email: user.email,
      token,
      expires,
    },
  });

  await sendTwoFactorTokenEmail(user.email, user.name || "User", token);
}

export async function resendTwoFactorChallenge(
  email: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const user = await getAuthUserByEmail(email);

  if (!user || !user.isTwoFactorEnabled) {
    return { success: false, message: "User not found or 2FA not enabled" };
  }

  await issueTwoFactorToken(user);
  return { success: true };
}

export async function verifyCredentialsLogin(input: {
  email: string;
  password: string;
  code?: string;
  requireTwoFactorCode: boolean;
}): Promise<CredentialsAuthResult> {
  const user = await getAuthUserByEmail(input.email);

  if (!user || !user.password) {
    return { status: "invalid", message: "Invalid credentials" };
  }

  const lifecycleError = getAccountLifecycleError(user);
  if (lifecycleError) {
    return { status: "banned", message: lifecycleError };
  }

  const isValidPassword = await comparePassword(input.password, user.password);
  if (!isValidPassword) {
    return { status: "invalid", message: "Invalid credentials" };
  }

  if (!user.emailVerified) {
    return {
      status: "email-unverified",
      message: "Please verify your email address",
    };
  }

  if (!user.isTwoFactorEnabled) {
    return { status: "success", user };
  }

  const normalizedCode =
    typeof input.code === "string"
      ? input.code.replace(/\D/g, "").slice(0, 6)
      : "";

  if (!input.requireTwoFactorCode) {
    await issueTwoFactorToken(user);
    return {
      status: "two-factor-required",
      message: "Please enter the code sent to your email",
    };
  }

  if (!normalizedCode) {
    return {
      status: "two-factor-invalid",
      message: "2FA code required",
    };
  }

  const twoFactorToken = await prisma.twoFactorToken.findUnique({
    where: {
      email_token: {
        email: user.email!,
        token: normalizedCode,
      },
    },
  });

  if (!twoFactorToken) {
    return {
      status: "two-factor-invalid",
      message: "Invalid 2FA code",
    };
  }

  if (new Date() > twoFactorToken.expires) {
    return {
      status: "two-factor-expired",
      message: "2FA code expired",
    };
  }

  await prisma.twoFactorToken.delete({
    where: { id: twoFactorToken.id },
  });

  await prisma.twoFactorConfirmation.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
    },
  });

  return { status: "success", user };
}

export function getPasswordValidationError(password: string): string | null {
  const validation = validatePasswordStrength(password);
  return validation.isValid ? null : validation.errors[0] ?? "Invalid password";
}
