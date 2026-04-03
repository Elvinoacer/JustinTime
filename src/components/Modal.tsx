"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: "warning" | "danger" | "success" | "info";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  compact?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  icon = "info",
  size = "md",
  closeOnOverlayClick = true,
  compact = false,
}: ModalProps) {
  const iconConfig = {
    warning: { color: "text-amber-600", bg: "bg-amber-100", icon: "warning" },
    danger: { color: "text-red-600", bg: "bg-red-100", icon: "error" },
    success: {
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      icon: "check_circle",
    },
    info: { color: "text-blue-600", bg: "bg-blue-100", icon: "info" },
  };

  const sizeConfig = {
    xs: "max-w-xs",
    sm: "max-w-sm sm:max-w-md",
    md: "max-w-md sm:max-w-lg",
    lg: "max-w-lg sm:max-w-xl",
    xl: "max-w-xl sm:max-w-2xl",
  };

  const config = iconConfig[icon];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />
        </Transition.Child>

        {/* Modal */}
        <div className="fixed inset-0 overflow-y-auto touch-manipulation">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-3 md:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full ${
                  sizeConfig[size]
                } transform overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl bg-white shadow-lg sm:shadow-xl md:shadow-2xl transition-all mx-auto ${
                  compact ? "max-h-[90dvh] overflow-y-auto" : ""
                }`}
              >
                <div
                  className={`${compact ? "p-3 sm:p-4" : "p-4 sm:p-5 md:p-6"}`}
                >
                  {/* Icon */}
                  {icon !== "info" && (
                    <div
                      className={`mx-auto flex ${
                        compact
                          ? "h-8 w-8 sm:h-10 sm:w-10"
                          : "h-10 w-10 sm:h-12 sm:w-12"
                      } items-center justify-center rounded-full ${
                        config.bg
                      } mb-2 sm:mb-3 ${compact ? "" : "md:mb-4"}`}
                    >
                      <span
                        className={`material-symbols-outlined ${
                          compact
                            ? "text-lg sm:text-xl"
                            : "text-xl sm:text-2xl md:text-3xl"
                        } ${config.color}`}
                      >
                        {config.icon}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <Dialog.Title
                    as="h3"
                    className={`font-bold text-gray-900 text-center ${
                      compact
                        ? "text-base sm:text-lg mb-1 sm:mb-1.5"
                        : "text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2"
                    }`}
                  >
                    {title}
                  </Dialog.Title>

                  {/* Description */}
                  {description && (
                    <Dialog.Description
                      className={`text-gray-600 text-center ${
                        compact
                          ? "text-xs sm:text-sm mb-3 sm:mb-4"
                          : "text-xs sm:text-sm mb-3 sm:mb-4 md:mb-6"
                      } ${compact ? "px-0" : "px-1 sm:px-0"}`}
                    >
                      {description}
                    </Dialog.Description>
                  )}

                  {/* Content */}
                  <div
                    className={`${
                      compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                    }`}
                  >
                    {children}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  danger?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  disabled?: boolean;
  compact?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  danger = false,
  size = "sm",
  disabled = false,
  compact = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={danger ? "danger" : "warning"}
      size={size}
      closeOnOverlayClick={!isLoading && !disabled}
      compact={compact}
    >
      <div
        className={`flex flex-col xs:flex-row gap-1.5 sm:gap-2 ${
          compact ? "mt-2 sm:mt-3" : "mt-3 sm:mt-4 md:mt-6"
        }`}
      >
        <button
          onClick={onClose}
          disabled={isLoading || disabled}
          className={`flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 ${
            compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
          }`}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || disabled}
          className={`flex-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1 sm:gap-1.5 ${
            compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
          } ${
            danger
              ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
              : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
          }`}
        >
          {isLoading && (
            <div
              className={`border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0 ${
                compact ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4"
              }`}
            />
          )}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
  rows?: number;
  compact?: boolean;
  type?: "text" | "textarea";
}

export function PromptModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  placeholder = "Enter your response...",
  submitText = "Submit",
  cancelText = "Cancel",
  isLoading = false,
  required = false,
  defaultValue = "",
  maxLength,
  rows = 3,
  compact = false,
  type = "textarea",
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (required && !value.trim()) {
      setError("This field is required");
      return;
    }
    if (maxLength && value.length > maxLength) {
      setError(`Maximum ${maxLength} characters allowed`);
      return;
    }
    setError("");
    onSubmit(value);
    setValue("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon="info"
      size="sm"
      closeOnOverlayClick={!isLoading}
      compact={compact}
    >
      <form
        onSubmit={handleSubmit}
        className={compact ? "mt-2 sm:mt-3" : "mt-3 sm:mt-4"}
      >
        <div className="relative">
          {type === "textarea" ? (
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              placeholder={placeholder}
              rows={rows}
              autoFocus
              className={`w-full px-3 py-2 sm:px-4 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400 font-normal leading-relaxed ${
                error ? "border-red-300" : "border-gray-300"
              } ${compact ? "text-sm" : "text-sm sm:text-base"}`}
              maxLength={maxLength}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              placeholder={placeholder}
              autoFocus
              className={`w-full px-3 py-2 sm:px-4 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 ${
                error ? "border-red-300" : "border-gray-300"
              } ${compact ? "text-sm" : "text-sm sm:text-base"}`}
              maxLength={maxLength}
            />
          )}
          {maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {value.length}/{maxLength}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">error</span>
            {error}
          </p>
        )}
        <div
          className={`flex flex-col xs:flex-row gap-1.5 sm:gap-2 ${
            compact ? "mt-2 sm:mt-3" : "mt-3 sm:mt-4"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 ${
              compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
            }`}
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={isLoading || (required && !value.trim())}
            className={`flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 sm:gap-1.5 ${
              compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
            }`}
          >
            {isLoading && (
              <div
                className={`border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0 ${
                  compact ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4"
                }`}
              />
            )}
            {submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  progress?: number; // 0-100
  compact?: boolean;
}

export function LoadingModal({
  isOpen,
  title = "Loading...",
  description = "Please wait while we process your request",
  progress,
  compact = false,
}: LoadingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={title}
      description={description}
      icon="info"
      size="sm"
      closeOnOverlayClick={false}
      compact={compact}
    >
      <div className={compact ? "mt-2 sm:mt-3" : "mt-3 sm:mt-4 md:mt-6"}>
        <div className="flex items-center justify-center">
          <div
            className={`border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin ${
              compact ? "w-6 h-6" : "w-8 h-8 sm:w-10 sm:h-10"
            }`}
          />
        </div>
        {progress !== undefined && (
          <div className={compact ? "mt-2 sm:mt-3" : "mt-3 sm:mt-4"}>
            <div
              className={`bg-gray-200 rounded-full overflow-hidden ${
                compact ? "h-1" : "h-1.5 sm:h-2"
              }`}
            >
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p
              className={`text-center text-gray-600 mt-0.5 ${
                compact ? "text-xs" : "text-xs sm:text-sm"
              }`}
            >
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// New: Compact Modal for small confirmations
interface CompactConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export function CompactConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "OK",
  cancelText = "Cancel",
  isLoading = false,
  danger = false,
  disabled = false,
}: CompactConfirmModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description || ""}
      confirmText={confirmText}
      cancelText={cancelText}
      isLoading={isLoading}
      danger={danger}
      size="xs"
      disabled={disabled}
      compact={true}
    />
  );
}

// New: Toast Modal for quick messages
interface ToastModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  autoClose?: boolean;
}

export function ToastModal({
  isOpen,
  onClose,
  title,
  description,
  type = "info",
  duration = 3000,
  autoClose = true,
}: ToastModalProps) {
  const iconConfig = {
    success: {
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      icon: "check_circle",
    },
    error: { color: "text-red-600", bg: "bg-red-100", icon: "error" },
    warning: { color: "text-amber-600", bg: "bg-amber-100", icon: "warning" },
    info: { color: "text-blue-600", bg: "bg-blue-100", icon: "info" },
  };

  const config = iconConfig[type];

  // Auto close after duration
  useState(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={type === "error" ? "danger" : type}
      size="xs"
      closeOnOverlayClick={true}
      compact={true}
    >
      <button
        onClick={onClose}
        className="w-full mt-2 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
      >
        Dismiss
      </button>
    </Modal>
  );
}
