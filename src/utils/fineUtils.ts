import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { whatsAppService } from './whatsappService';

export interface FineSlipData {
    studentName: string;
    department: string;
    semester: string;
    fineAmount: number;
    entryTime: string;
    date: string;
    period: number;
    qrCodeData: string; // UPI payment string
}

export const generateQRCode = async (data: string): Promise<string> => {
    try {
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error('QR Code generation failed:', err);
        return '';
    }
};

export const generateFineSlipPDF = (data: FineSlipData, qrCodeImage: string): string => {
    const pdf = new jsPDF();

    // Title
    pdf.setFontSize(20);
    pdf.text('Late Entry Fine Slip', 105, 20, { align: 'center' });

    // Student Details
    pdf.setFontSize(12);
    pdf.text(`Student Name: ${data.studentName}`, 20, 40);
    pdf.text(`Department: ${data.department}`, 20, 50);
    pdf.text(`Semester: ${data.semester}`, 20, 60);
    pdf.text(`Entry Time: ${data.entryTime}`, 20, 70);
    pdf.text(`Date: ${data.date}`, 20, 80);
    pdf.text(`Period: ${data.period}`, 20, 90);
    pdf.text(`Fine Amount: ₹${data.fineAmount}`, 20, 100);

    // Instructions
    pdf.text('Please pay the fine using the QR code below to mark attendance.', 20, 120);

    // QR Code
    if (qrCodeImage) {
        pdf.addImage(qrCodeImage, 'PNG', 60, 130, 80, 80);
    }

    // Footer
    pdf.setFontSize(10);
    pdf.text('Face Recognition Attendance System', 105, 280, { align: 'center' });

    return pdf.output('datauristring');
};

import { getPeriodLateThreshold, getPeriodEnd } from './periodUtils';

export const calculateFineAmount = (entryTime: Date, period: number = 1): number => {
    const lateThreshold = getPeriodLateThreshold(period);
    const periodEnd = getPeriodEnd(period);

    if (entryTime <= lateThreshold || entryTime > periodEnd) return 0;

    const minutesLate = Math.floor((entryTime.getTime() - lateThreshold.getTime()) / (1000 * 60));
    // Fine: ₹10 per 5 minutes late, minimum ₹20
    const fine = Math.max(20, Math.ceil(minutesLate / 5) * 10);
    return fine;
};

export const generateUPIPaymentString = (amount: number, merchantId: string = 'rakheesmeppally-1@oksbi'): string => {
    // Example UPI string
    return `upi://pay?pa=${merchantId}&pn=Fine%20Payment&am=${amount}&cu=INR&tn=Late%20Entry%20Fine`;
};

export const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
    return await whatsAppService.sendMessage(phoneNumber, message);
};

export const generateFineQRCode = async (fineAmount: number, merchantId: string = 'rakheesmeppally-1@oksbi'): Promise<string> => {
    const upiString = generateUPIPaymentString(fineAmount, merchantId);
    return await generateQRCode(upiString);
};