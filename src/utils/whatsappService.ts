// WhatsApp Web Integration Utility
// This provides a simple interface for WhatsApp messaging in the browser

export interface WhatsAppMessage {
    phoneNumber: string;
    message: string;
    type?: 'text' | 'image' | 'document';
    mediaUrl?: string;
}

export class WhatsAppWebService {
    private static instance: WhatsAppWebService;

    private constructor() {}

    static getInstance(): WhatsAppWebService {
        if (!WhatsAppWebService.instance) {
            WhatsAppWebService.instance = new WhatsAppWebService();
        }
        return WhatsAppWebService.instance;
    }

    /**
     * Send a WhatsApp message by opening WhatsApp Web
     */
    async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
        try {
            // If no phone number, open WhatsApp with message for user to forward
            if (!phoneNumber || phoneNumber.trim() === '') {
                const encodedMessage = encodeURIComponent(message);
                // Open WhatsApp Web directly with the message
                const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
                const newWindow = window.open(whatsappUrl, '_blank');

                if (newWindow) {
                    console.log('WhatsApp Web opened with message for forwarding');
                    return true;
                } else {
                    console.error('Failed to open WhatsApp Web - popup might be blocked');
                    return false;
                }
            }

            // Format phone number to international format if not already
            const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

            // Remove any non-numeric characters except +
            const cleanNumber = formattedNumber.replace(/[^\d+]/g, '');

            // Validate phone number format
            if (!this.isValidPhoneNumber(cleanNumber)) {
                console.error('Invalid phone number format:', cleanNumber);
                return false;
            }

            // Encode the message for URL
            const encodedMessage = encodeURIComponent(message);

            // Create WhatsApp Web URL
            const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

            // Open WhatsApp Web in a new tab/window
            const newWindow = window.open(whatsappUrl, '_blank');

            if (newWindow) {
                console.log(`WhatsApp Web opened for ${cleanNumber}`);
                return true;
            } else {
                console.error('Failed to open WhatsApp Web - popup might be blocked');
                return false;
            }
        } catch (error) {
            console.error('Error opening WhatsApp Web:', error);
            return false;
        }
    }

    /**
     * Send bulk messages (opens multiple tabs)
     */
    async sendBulkMessages(messages: WhatsAppMessage[]): Promise<boolean[]> {
        const results: boolean[] = [];

        for (const msg of messages) {
            const result = await this.sendMessage(msg.phoneNumber, msg.message);
            results.push(result);

            // Small delay between messages to avoid overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return results;
    }

    /**
     * Validate phone number format
     */
    private isValidPhoneNumber(phoneNumber: string): boolean {
        // Basic validation: should start with + and have 10-15 digits
        const phoneRegex = /^\+\d{10,15}$/;
        return phoneRegex.test(phoneNumber);
    }

    /**
     * Format message for fine notifications
     */
    formatFineMessage(fineData: {
        studentName: string;
        department: string;
        semester: string;
        entryTime: string;
        fineAmount: number;
        upiString: string;
    }): string {
        return `Late Entry Fine Slip

Student: ${fineData.studentName}
Department: ${fineData.department}
Semester: ${fineData.semester}
Entry Time: ${fineData.entryTime}
Fine: ₹${fineData.fineAmount}

UPI Payment: ${fineData.upiString}

Please pay the fine using the above UPI string to mark your attendance.`;
    }

    /**
     * Format parent notification message
     */
    formatParentMessage(fineData: {
        studentName: string;
        department: string;
        semester: string;
        entryTime: string;
        fineAmount: number;
    }): string {
        return `Late Entry Fine Slip for ${fineData.studentName}

Department: ${fineData.department}
Semester: ${fineData.semester}
Entry Time: ${fineData.entryTime}
Fine: ₹${fineData.fineAmount}

Please ensure the fine is paid.`;
    }
}

// Export singleton instance
export const whatsAppService = WhatsAppWebService.getInstance();