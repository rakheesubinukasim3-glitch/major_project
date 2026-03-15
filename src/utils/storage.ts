export interface FaceRegistration {
    id: string;
    admissionNumber?: string;
    name: string;
    descriptor: number[];
    photo?: string; // Base64 encoded photo
    department?: string;
    semester?: string;
    studentWhatsApp?: string;
    parentWhatsApp?: string;
}

export interface AttendanceRecord {
    id: string;
    name: string;
    timestamp: string;
    date: string;
    status: 'present' | 'absent';
    period: number; // 1..6
    remark?: string;
}

export interface FineRecord {
    id: string; // unique fine id
    studentId: string;
    studentName: string;
    department: string;
    semester: string;
    entryTime: string;
    fineAmount: number;
    date: string;
    period: number;
    paid: boolean;
    qrCode?: string; // base64 QR code image
}

const STORAGE_KEYS = {
    REGISTRATIONS: 'face_attendance_registrations',
    ATTENDANCE: 'face_attendance_records',
    FINES: 'face_attendance_fines',
};

export const saveRegistration = (registration: FaceRegistration) => {
    const registrations = getRegistrations();

    // Prevent duplicates by student ID: update existing entry if found
    const existingIndex = registrations.findIndex(r => r.id === registration.id);
    if (existingIndex !== -1) {
        registrations[existingIndex] = {
            ...registrations[existingIndex],
            ...registration,
        };
    } else {
        registrations.push(registration);
    }

    // Also prevent duplicate admission numbers by updating any matching record
    if (registration.admissionNumber) {
        const duplicateIdx = registrations.findIndex(r => r.admissionNumber === registration.admissionNumber && r.id !== registration.id);
        if (duplicateIdx !== -1) {
            registrations[duplicateIdx] = {
                ...registrations[duplicateIdx],
                admissionNumber: undefined,
            };
        }
    }

    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'students' } })); } catch (e) { console.warn('dispatch event failed', e); }
};

export const getRegistrations = (): FaceRegistration[] => {
    const data = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (!data) return [];

    try {
        const parsed: FaceRegistration[] = JSON.parse(data);
        // Ensure no duplicated IDs in the returned list.
        const uniqueMap = new Map<string, FaceRegistration>();
        parsed.forEach(reg => {
            uniqueMap.set(reg.id, reg);
        });
        return Array.from(uniqueMap.values());
    } catch (err) {
        console.error('Error parsing registrations:', err);
        return [];
    }
};

export const saveAttendance = (name: string, id: string, period: number = 1) => {
    const attendance = getAttendance();
    const now = new Date();
    const date = now.toISOString().split('T')[0];

    // Remove any existing absent record for this student on this date & period
    const filteredAttendance = attendance.filter(a => !(a.id === id && a.date === date && a.period === period && a.status === 'absent'));

    const record: AttendanceRecord = {
        id,
        name,
        timestamp: now.toISOString(),
        date,
        status: 'present',
        period,
        remark: undefined,
    };
    filteredAttendance.push(record);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filteredAttendance));
};

export const getAttendance = (): AttendanceRecord[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!data) return [];
    try {
        const parsed = JSON.parse(data) as unknown[];
        // normalize older records that may not have `period` or `remark`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return parsed.map((p: any) => ({
            id: p.id,
            name: p.name,
            timestamp: p.timestamp,
            date: p.date,
            status: p.status,
            period: p.period ?? 1,
            remark: p.remark ?? undefined,
        })) as AttendanceRecord[];
    } catch {
        return [];
    }
};

export const saveFine = (fine: FineRecord): boolean => {
    const fines = getFines();
    // Prevent multiple fines for the same student on the same date
    const alreadyExists = fines.some(f => f.studentId === fine.studentId && f.date === fine.date);
    if (alreadyExists) {
        return false;
    }
    fines.push(fine);
    localStorage.setItem(STORAGE_KEYS.FINES, JSON.stringify(fines));
    return true;
};

export const getFines = (): FineRecord[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FINES);
    return data ? JSON.parse(data) : [];
};

export const markFinePaid = (fineId: string) => {
    const fines = getFines();
    const fineIndex = fines.findIndex(f => f.id === fineId);
    if (fineIndex !== -1) {
        const fine = fines[fineIndex];
        const wasUnpaid = !fine.paid;
        fines[fineIndex].paid = true;
        localStorage.setItem(STORAGE_KEYS.FINES, JSON.stringify(fines));

        // If the fine was unpaid and now paid, mark attendance as present
        if (wasUnpaid) {
            const attendance = getAttendance();
            const alreadyPresent = attendance.some(a =>
                a.id === fine.studentId &&
                a.date === fine.date &&
                a.period === fine.period &&
                a.status === 'present'
            );

            if (!alreadyPresent) {
                // Mark as present now that fine is paid
                saveAttendance(fine.studentName, fine.studentId, fine.period);
            }
        }

        return fines[fineIndex];
    }
    return null;
};

export const deleteFine = (fineId: string) => {
    const fines = getFines();
    const filteredFines = fines.filter(f => f.id !== fineId);
    localStorage.setItem(STORAGE_KEYS.FINES, JSON.stringify(filteredFines));
    return filteredFines.length < fines.length; // Return true if a fine was deleted
};

export const generateMissingQRCodes = async (merchantId: string = 'rakheesmeppally-1@oksbi') => {
    const fines = getFines();
    let updated = false;

    for (let i = 0; i < fines.length; i++) {
        if (!fines[i].qrCode) {
            try {
                // Import the function dynamically to avoid circular imports
                const { generateFineQRCode } = await import('./fineUtils');
                const qrCode = await generateFineQRCode(fines[i].fineAmount, merchantId);
                fines[i].qrCode = qrCode;
                updated = true;
            } catch (error) {
                console.error(`Failed to generate QR code for fine ${fines[i].id}:`, error);
            }
        }
    }

    if (updated) {
        localStorage.setItem(STORAGE_KEYS.FINES, JSON.stringify(fines));
    }

    return updated;
};

export const regenerateFineQRCode = async (fineId: string, merchantId: string = 'rakheesmeppally-1@oksbi') => {
    const fines = getFines();
    const fineIndex = fines.findIndex(f => f.id === fineId);

    if (fineIndex !== -1) {
        try {
            // Import the function dynamically to avoid circular imports
            const { generateFineQRCode } = await import('./fineUtils');
            const qrCode = await generateFineQRCode(fines[fineIndex].fineAmount, merchantId);
            fines[fineIndex].qrCode = qrCode;
            localStorage.setItem(STORAGE_KEYS.FINES, JSON.stringify(fines));
            return qrCode;
        } catch (error) {
            console.error(`Failed to regenerate QR code for fine ${fineId}:`, error);
        }
    }

    return null;
};

export const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.FINES);
    try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'all' } })); } catch (e) { console.warn('dispatch event failed', e); }
};

export const markAllStudentsAbsentForDay = (date: string) => {
    const registrations = getRegistrations();
    const attendance = getAttendance();
    // We'll ensure for each period (1..6) every student has a record: present if already present, otherwise absent
    const periods = [1,2,3,4,5,6];

    // Keep records that are not for this date
    const otherRecords = attendance.filter(a => a.date !== date);

    // For each period, find present IDs for that specific period
    const newRecords = [...otherRecords];
    const baseTime = new Date();
    let offset = 0;

    for (const period of periods) {
        const recordsForPeriod = attendance.filter(a => a.date === date && a.period === period);
        const presentIds = new Set(recordsForPeriod.filter(r => r.status === 'present').map(r => r.id));

        // Keep present records for this period
        for (const rec of recordsForPeriod) {
            if (rec.status === 'present') newRecords.push(rec);
        }

        // Add absent record for students not present in this period
        for (const reg of registrations) {
            if (!presentIds.has(reg.id)) {
                const timestamp = new Date(baseTime.getTime() + offset).toISOString();
                newRecords.push({
                    id: reg.id,
                    name: reg.name,
                    timestamp,
                    date,
                    status: 'absent',
                    period,
                });
                offset += 1; // ensure unique timestamps
            }
        }
    }

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(newRecords));
};

export const markAllStudentsAbsentForPeriod = (date: string, period: number) => {
    const registrations = getRegistrations();
    const attendance = getAttendance();
    // We will overwrite this date+period with explicit absent records for ALL students
    // This changes any present records for the period into absent (bulk action)
    const otherRecords = attendance.filter(a => !(a.date === date && a.period === period));
    const newRecords = [...otherRecords];
    const baseTime = new Date();
    let offset = 0;

    for (const reg of registrations) {
        const timestamp = new Date(baseTime.getTime() + offset).toISOString();
        newRecords.push({
            id: reg.id,
            name: reg.name,
            timestamp,
            date,
            status: 'absent',
            period,
            remark: 'Marked absent (bulk)'
        });
        offset += 1;
    }

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(newRecords));
};

export const toggleAttendanceStatus = (timestamp: string) => {
    const attendance = getAttendance();
    const recordIndex = attendance.findIndex(a => a.timestamp === timestamp);
    
    if (recordIndex !== -1) {
        attendance[recordIndex].status = attendance[recordIndex].status === 'present' ? 'absent' : 'present';
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
        return true;
    }
    return false;
};

export const updateStudentInfo = (currentId: string, newName: string, newId: string, photo?: string, department?: string, semester?: string, studentWhatsApp?: string, parentWhatsApp?: string, descriptor?: number[]) => {
    const registrations = getRegistrations();
    const studentIndex = registrations.findIndex(r => r.id === currentId);
    
    if (studentIndex !== -1) {
        // Check if new ID is already taken (exclude current student)
        const idExists = registrations.some((r, idx) => idx !== studentIndex && r.id === newId);
        if (idExists) {
            throw new Error('ID already exists');
        }
        
        const oldId = registrations[studentIndex].id;
        registrations[studentIndex].name = newName;
        registrations[studentIndex].id = newId;
        if (photo !== undefined) {
            registrations[studentIndex].photo = photo;
        }
        if (descriptor !== undefined) {
            registrations[studentIndex].descriptor = descriptor;
        }
        if (department !== undefined) {
            registrations[studentIndex].department = department;
        }
        if (semester !== undefined) {
            registrations[studentIndex].semester = semester;
        }
        if (studentWhatsApp !== undefined) {
            registrations[studentIndex].studentWhatsApp = studentWhatsApp;
        }
        if (parentWhatsApp !== undefined) {
            registrations[studentIndex].parentWhatsApp = parentWhatsApp;
        }
        
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
        try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'students' } })); } catch (e) { console.warn('dispatch event failed', e); }
        
        // Update attendance records with new ID
        const attendance = getAttendance();
        const updatedAttendance = attendance.map(a => 
            a.id === oldId ? { ...a, id: newId, name: newName } : a
        );
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updatedAttendance));
        try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'attendance' } })); } catch (e) { console.warn('dispatch event failed', e); }
        
        return true;
    }
    return false;
};

export const deleteStudent = (id: string) => {
    // Remove from registrations
    const registrations = getRegistrations();
    const filtered = registrations.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(filtered));
    try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'students' } })); } catch (e) { console.warn('dispatch event failed', e); }
    
    // Remove all attendance records for this student
    const attendance = getAttendance();
    const filteredAttendance = attendance.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filteredAttendance));
    try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'attendance' } })); } catch (e) { console.warn('dispatch event failed', e); }

    // Remove any fines for this student as well
    const fines = getFines();
    const filteredFines = fines.filter(f => f.studentId !== id);
    if (filteredFines.length !== fines.length) {
        localStorage.setItem(STORAGE_KEYS.FINES, JSON.stringify(filteredFines));
        try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'fines' } })); } catch (e) { console.warn('dispatch event failed', e); }
    }
};

export const deleteAttendanceRecord = (timestamp: string) => {
    const attendance = getAttendance();
    const filtered = attendance.filter(a => a.timestamp !== timestamp);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filtered));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
