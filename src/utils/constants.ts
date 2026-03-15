export const DEPARTMENTS = [
    'COMPUTER HARDWARE ENGINEERING',
    'COMPUTER ENGINEERING',
    'ELECTRONICS ENGINEERING',
    'EEE',
    'CIVIL ENGINEERING',
    'AI AND ML',
    'CF'
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const SUBJECTS_BY_DEPARTMENT: Record<Department, readonly string[]> = {
    'COMPUTER HARDWARE ENGINEERING': [
        'Digital Electronics',
        'Microprocessors',
        'Embedded Systems',
        'Computer Organization'
    ],
    'COMPUTER ENGINEERING': [
        'Data Structures',
        'Algorithms',
        'Operating Systems',
        'Database Management',
        'Computer Networks'
    ],
    'ELECTRONICS ENGINEERING': [
        'Circuit Theory',
        'Analog Electronics',
        'Digital Signal Processing',
        'Control Systems'
    ],
    'EEE': [
        'Electrical Machines',
        'Power Systems',
        'Renewable Energy',
        'Power Electronics'
    ],
    'CIVIL ENGINEERING': [
        'Strength of Materials',
        'Fluid Mechanics',
        'Structural Analysis',
        'Construction Technology'
    ],
    'AI AND ML': [
        'Machine Learning',
        'Deep Learning',
        'Data Mining',
        'Artificial Intelligence'
    ],
    'CF': [
        'Finance Fundamentals',
        'Business Communication',
        'Project Management',
        'Ethics and Governance'
    ]
};
