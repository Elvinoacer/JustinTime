
/**
 * Mock Service for GavaConnect (Government Services Bus).
 * Simulates KRA integration for PIN validation, TCC checks, and Tax Filing.
 */

export interface KraPinDetails {
    isValid: boolean;
    name?: string;
    pin?: string;
    message?: string;
}

export interface TccDetails {
    isValid: boolean;
    number?: string;
    expiryDate?: Date;
    message?: string;
}

export interface FilingResult {
    success: boolean;
    ackNumber?: string;
    message?: string;
}

export const GavaConnect = {
    /**
     * Verifies a KRA PIN.
     * Mock Rule: PIN must be 11 characters, start with 'A' or 'P', and end with a letter.
     */
    verifyPin: async (pin: string): Promise<KraPinDetails> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const normalizedPin = pin.toUpperCase().trim();
        const pinRegex = /^[AP][0-9]{9}[A-Z]$/;

        if (!pinRegex.test(normalizedPin)) {
            return { isValid: false, message: "Invalid PIN format. Must be A000000000Z format." };
        }

        return {
            isValid: true,
            pin: normalizedPin,
            name: "JOHN DOE MOCK PROFILE" 
        };
    },

    /**
     * Checks Tax Compliance Certificate Status.
     * Mock Rule: If TCC number contains "EXP", it returns expired. Otherwise valid for 1 year.
     */
    checkTccStatus: async (tccNumber: string): Promise<TccDetails> => {
        await new Promise(resolve => setTimeout(resolve, 800));

        if (!tccNumber) return { isValid: false, message: "Missing TCC Number" };

        if (tccNumber.toUpperCase().includes("EXP")) {
            return {
                isValid: false,
                message: "Certificate Expired",
                number: tccNumber,
                expiryDate: new Date(Date.now() - 86400000 * 10) // Expired 10 days ago
            };
        }

        return {
            isValid: true,
            message: "Compliant",
            number: tccNumber,
            expiryDate: new Date(Date.now() + 86400000 * 180) // Valid for 180 days
        };
    },

    /**
     * Files a Nil Return for the specified period.
     */
    fileNilReturn: async (pin: string, period: string): Promise<FilingResult> => {
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (!pin) return { success: false, message: "PIN Required" };
        
        // Mock success
        const ackNumber = `KRA2026-NIL-${Math.floor(Math.random() * 1000000)}`;
        return {
            success: true,
            ackNumber,
            message: "Nil Return Filed Successfully"
        };
    }
};
