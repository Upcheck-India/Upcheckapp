export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    imageUrl: string;
    date: string;
    source: string;
}

export interface AlertItem {
    id: string;
    type: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    date: string;
    read: boolean;
}

const MOCK_NEWS: NewsItem[] = [
    {
        id: '1',
        title: 'Global Shrimp Market Report Q1',
        summary: 'Export prices see a slight uptick as demand in EU recovers. Key insights for farmers on stocking strategies.',
        imageUrl: 'https://picsum.photos/400/200?random=1',
        date: '2025-01-20',
        source: 'AquaNews'
    },
    {
        id: '2',
        title: 'New Disease Resistant Strain',
        summary: 'Research institute releases findings on new Monodon strain showing 30% better survival rates.',
        imageUrl: 'https://picsum.photos/400/200?random=2',
        date: '2025-01-18',
        source: 'Science Daily'
    },
    {
        id: '3',
        title: 'Sustainable Feed Practices',
        summary: 'Reducing FCR through automated feeding systems. Case studies from leading farms.',
        imageUrl: 'https://picsum.photos/400/200?random=3',
        date: '2025-01-15',
        source: 'Farm Tech'
    }
];

const MOCK_ALERTS: AlertItem[] = [
    {
        id: '1',
        type: 'warning',
        title: 'Low Oxygen Levels',
        message: 'Pond A-02 reported DO < 3.0 mg/L last night. Check aerators.',
        date: '2025-01-26T08:00:00',
        read: false
    },
    {
        id: '2',
        type: 'info',
        title: 'Feed Delivery Arriving',
        message: 'Your order #12345 is out for delivery. Expected by 2 PM.',
        date: '2025-01-25T14:30:00',
        read: true
    },
    {
        id: '3',
        type: 'success',
        title: 'Harvest Successfully Recorded',
        message: 'Data for Pond B-01 harvest has been synced to the server.',
        date: '2025-01-24T18:45:00',
        read: true
    }
];

export const MockDataService = {
    getNews: async (): Promise<NewsItem[]> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_NEWS;
    },

    getAlerts: async (): Promise<AlertItem[]> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_ALERTS;
    }
};
