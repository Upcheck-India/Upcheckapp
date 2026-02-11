export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    currency: string;
    imageUrl: string;
    description: string;
    rating: number;
}

const PRODUCTS: Product[] = [
    {
        id: '1',
        name: 'Probiotic Multi-Strain',
        category: 'Probiotics',
        price: 450,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=10',
        description: 'High concentration probiotic improving water quality and gut health.',
        rating: 4.5
    },
    {
        id: '2',
        name: 'Shrimp Grower Feed 40%',
        category: 'Feed',
        price: 2200,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=11',
        description: 'Premium grower feed with 40% protein content for rapid growth.',
        rating: 4.8
    },
    {
        id: '3',
        name: 'Dolomite High Grade',
        category: 'Minerals',
        price: 350,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=12',
        description: 'Rich in Calcium and Magnesium, essential for alkalinity management.',
        rating: 4.2
    },
    {
        id: '4',
        name: 'Aerator 2HP',
        category: 'Equipment',
        price: 15000,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=13',
        description: 'Energy efficient paddle wheel aerator for maintaining DO levels.',
        rating: 4.9
    },
    {
        id: '5',
        name: 'Zeolite Powder',
        category: 'Minerals',
        price: 600,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=14',
        description: 'Effective for absorbing Ammonia and improving water clarity.',
        rating: 4.3
    }
];

export const MockProductService = {
    getProducts: async (): Promise<Product[]> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return PRODUCTS;
    },

    getCategories: (): string[] => {
        return ['All', 'Feed', 'Minerals', 'Probiotics', 'Equipment'];
    }
};
