export interface Seller {
    id: string;
    name: string;
    rating: number;
    totalSales: number;
    location: string;
    verified: boolean;
    since: string;
    responseTime: string;
}

export interface SpecItem {
    label: string;
    value: string;
}

export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    currency: string;
    imageUrl: string;
    description: string;
    rating: number;
    reviewCount: number;
    inStock: boolean;
    stockQty?: number;
    unit: string;
    seller: Seller;
    universalSpecs: SpecItem[];
    productSpecs: SpecItem[];
    discount?: number;
    tags?: string[];
}

export interface CartItem {
    product: Product;
    qty: number;
}

export interface Coupon {
    code: string;
    discount: number;
    type: 'percent' | 'flat';
    description: string;
    minOrder: number;
}

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderItem {
    product: Product;
    qty: number;
    price: number;
}

export interface Order {
    id: string;
    items: OrderItem[];
    subtotal: number;
    discount: number;
    deliveryFee: number;
    total: number;
    couponCode?: string;
    status: OrderStatus;
    placedAt: string;
    estimatedDelivery: string;
    address: string;
    trackingId?: string;
}

const SELLERS: Record<string, Seller> = {
    aquamax: {
        id: 'aquamax',
        name: 'AquaMax Supplies',
        rating: 4.7,
        totalSales: 3240,
        location: 'Vijayawada, AP',
        verified: true,
        since: '2019',
        responseTime: '< 2 hrs',
    },
    biofarm: {
        id: 'biofarm',
        name: 'BioFarm Solutions',
        rating: 4.5,
        totalSales: 1860,
        location: 'Chennai, TN',
        verified: true,
        since: '2021',
        responseTime: '< 4 hrs',
    },
    shrimptek: {
        id: 'shrimptek',
        name: 'ShrimpTek India',
        rating: 4.8,
        totalSales: 5120,
        location: 'Nellore, AP',
        verified: true,
        since: '2017',
        responseTime: '< 1 hr',
    },
    aqualife: {
        id: 'aqualife',
        name: 'AquaLife Minerals',
        rating: 4.3,
        totalSales: 980,
        location: 'Kakinada, AP',
        verified: false,
        since: '2022',
        responseTime: '< 6 hrs',
    },
};

const UNIVERSAL_SPECS: SpecItem[] = [
    { label: 'Grade', value: 'Aquaculture Grade' },
    { label: 'Certification', value: 'BIS / FSSAI Approved' },
    { label: 'Origin', value: 'Made in India' },
    { label: 'Shelf Life', value: '24 months' },
    { label: 'Packaging', value: 'Sealed HDPE bag' },
    { label: 'Storage', value: 'Cool, dry place' },
];

const PRODUCTS: Product[] = [
    {
        id: '1',
        name: 'Probiotic Multi-Strain',
        category: 'Probiotics',
        price: 450,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=10',
        description: 'High concentration multi-strain probiotic blend that significantly improves pond water quality, suppresses pathogenic bacteria, and enhances shrimp gut health and immunity.',
        rating: 4.5,
        reviewCount: 128,
        inStock: true,
        stockQty: 200,
        unit: '500g bag',
        discount: 20,
        seller: SELLERS.biofarm,
        universalSpecs: UNIVERSAL_SPECS,
        productSpecs: [
            { label: 'CFU/g', value: '1 × 10⁹' },
            { label: 'Strains', value: '5 species (Bacillus)' },
            { label: 'Moisture', value: '≤ 8%' },
            { label: 'Application', value: 'Direct pond dosing' },
            { label: 'Dose', value: '200–500g / acre' },
            { label: 'Frequency', value: 'Every 10–15 days' },
        ],
        tags: ['bestseller', 'water quality'],
    },
    {
        id: '2',
        name: 'Shrimp Grower Feed 40%',
        category: 'Feed',
        price: 2200,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=11',
        description: 'Premium grower pellet feed with 40% crude protein content formulated for rapid weight gain, improved FCR, and high survival rates in intensive shrimp culture.',
        rating: 4.8,
        reviewCount: 312,
        inStock: true,
        stockQty: 85,
        unit: '25 kg bag',
        discount: 15,
        seller: SELLERS.shrimptek,
        universalSpecs: UNIVERSAL_SPECS,
        productSpecs: [
            { label: 'Crude Protein', value: '≥ 40%' },
            { label: 'Crude Fat', value: '≥ 8%' },
            { label: 'Moisture', value: '≤ 12%' },
            { label: 'Ash', value: '≤ 15%' },
            { label: 'Pellet Size', value: '1.5 – 2.2 mm' },
            { label: 'FCR', value: '1.2 – 1.4' },
        ],
        tags: ['top rated', 'fast growth'],
    },
    {
        id: '3',
        name: 'Dolomite High Grade',
        category: 'Minerals',
        price: 350,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=12',
        description: 'High-purity agricultural dolomite rich in Calcium and Magnesium. Essential for alkalinity management, pond bottom liming, and improving shrimp immunity.',
        rating: 4.2,
        reviewCount: 87,
        inStock: true,
        stockQty: 500,
        unit: '50 kg bag',
        seller: SELLERS.aqualife,
        universalSpecs: UNIVERSAL_SPECS,
        productSpecs: [
            { label: 'CaCO₃', value: '≥ 55%' },
            { label: 'MgCO₃', value: '≥ 40%' },
            { label: 'Mesh Size', value: '100 mesh' },
            { label: 'pH (10% soln)', value: '8.5 – 9.5' },
            { label: 'Dose', value: '200–300 kg / acre' },
            { label: 'Application', value: 'Pond bottom / water' },
        ],
    },
    {
        id: '4',
        name: 'Aerator 2HP Paddle Wheel',
        category: 'Equipment',
        price: 15000,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=13',
        description: 'Energy-efficient 2HP paddle wheel aerator engineered for sustained dissolved oxygen management in intensive shrimp ponds. Built with corrosion-resistant stainless steel floats.',
        rating: 4.9,
        reviewCount: 201,
        inStock: true,
        stockQty: 12,
        unit: '1 unit',
        discount: 30,
        seller: SELLERS.aquamax,
        universalSpecs: [
            { label: 'Grade', value: 'Industrial' },
            { label: 'Certification', value: 'ISI Mark' },
            { label: 'Origin', value: 'Made in India' },
            { label: 'Warranty', value: '1 Year' },
            { label: 'Shipping', value: 'Free (>₹2000)' },
            { label: 'Returns', value: '7-day policy' },
        ],
        productSpecs: [
            { label: 'Power', value: '2 HP (1.5 kW)' },
            { label: 'Voltage', value: '220V / 50 Hz AC' },
            { label: 'Material', value: 'SS 304 floats' },
            { label: 'Impeller', value: '10-blade HDPE' },
            { label: 'DO Transfer', value: '1.8 kg O₂/hr' },
            { label: 'Coverage', value: '0.5 – 1 acre' },
        ],
        tags: ['premium', 'top rated'],
    },
    {
        id: '5',
        name: 'Zeolite Powder',
        category: 'Minerals',
        price: 600,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=14',
        description: 'Natural zeolite mineral highly effective at absorbing toxic ammonia, reducing sludge, and improving water clarity in shrimp and fish ponds.',
        rating: 4.3,
        reviewCount: 95,
        inStock: true,
        stockQty: 320,
        unit: '25 kg bag',
        seller: SELLERS.aqualife,
        universalSpecs: UNIVERSAL_SPECS,
        productSpecs: [
            { label: 'Zeolite Content', value: '≥ 85%' },
            { label: 'NH₄⁺ Exchange', value: '≥ 120 meq/100g' },
            { label: 'Mesh Size', value: '20 – 40 mesh' },
            { label: 'Moisture', value: '≤ 10%' },
            { label: 'Dose', value: '100–200 kg / acre' },
            { label: 'Application', value: 'Broadcast on water' },
        ],
    },
    {
        id: '6',
        name: 'Shrimp Starter Feed 45%',
        category: 'Feed',
        price: 1800,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=20',
        description: 'High-protein micro-pellet feed for PL-15 to DOC-45 stage shrimp. Enhanced with attractants, vitamins, and amino acids for maximum early survival.',
        rating: 4.6,
        reviewCount: 143,
        inStock: true,
        stockQty: 60,
        unit: '20 kg bag',
        discount: 10,
        seller: SELLERS.shrimptek,
        universalSpecs: UNIVERSAL_SPECS,
        productSpecs: [
            { label: 'Crude Protein', value: '≥ 45%' },
            { label: 'Crude Fat', value: '≥ 10%' },
            { label: 'Moisture', value: '≤ 10%' },
            { label: 'Pellet Size', value: '0.5 – 0.8 mm' },
            { label: 'Stage', value: 'PL-15 to DOC-45' },
            { label: 'FCR', value: '1.1 – 1.3' },
        ],
        tags: ['starter', 'high protein'],
    },
    {
        id: '7',
        name: 'Calcium Hypochlorite 70%',
        category: 'Chemicals',
        price: 1200,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=21',
        description: 'High-strength calcium hypochlorite for pond disinfection, pathogen control, and water treatment. Effective against vibrio and other bacterial pathogens.',
        rating: 4.4,
        reviewCount: 67,
        inStock: true,
        stockQty: 150,
        unit: '25 kg drum',
        seller: SELLERS.aquamax,
        universalSpecs: UNIVERSAL_SPECS,
        productSpecs: [
            { label: 'Active Chlorine', value: '≥ 70%' },
            { label: 'Form', value: 'Granular powder' },
            { label: 'Solubility', value: 'High (cold water)' },
            { label: 'Dose', value: '1–2 kg / acre' },
            { label: 'Contact Time', value: '24–48 hrs' },
            { label: 'pH Range', value: '6.5 – 8.5' },
        ],
        tags: ['disinfectant', 'pond prep'],
    },
    {
        id: '8',
        name: 'DO Meter Digital',
        category: 'Equipment',
        price: 4500,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=22',
        description: 'Professional waterproof dissolved oxygen meter with automatic temperature compensation. Ideal for daily DO monitoring in shrimp ponds and hatcheries.',
        rating: 4.7,
        reviewCount: 189,
        inStock: false,
        unit: '1 unit',
        seller: SELLERS.aquamax,
        universalSpecs: [
            { label: 'Grade', value: 'Professional' },
            { label: 'Certification', value: 'CE Certified' },
            { label: 'Origin', value: 'Imported' },
            { label: 'Warranty', value: '2 Years' },
            { label: 'Shipping', value: 'Free (>₹2000)' },
            { label: 'Returns', value: '7-day policy' },
        ],
        productSpecs: [
            { label: 'Range', value: '0 – 20 mg/L' },
            { label: 'Accuracy', value: '± 0.2 mg/L' },
            { label: 'Resolution', value: '0.01 mg/L' },
            { label: 'Temp Comp', value: 'Automatic (0–50°C)' },
            { label: 'Display', value: 'LCD dual display' },
            { label: 'IP Rating', value: 'IP67 Waterproof' },
        ],
        tags: ['out of stock', 'monitoring'],
    },
    {
        id: '9',
        name: 'EDTA Disodium Salt',
        category: 'Chemicals',
        price: 850,
        currency: '₹',
        imageUrl: 'https://picsum.photos/300/300?random=23',
        description: 'Pharma-grade EDTA for chelating heavy metals in pond water, neutralizing pesticide toxicity, and improving the bioavailability of minerals for shrimp.',
        rating: 4.1,
        reviewCount: 52,
        inStock: true,
        stockQty: 240,
        unit: '5 kg bag',
        seller: SELLERS.biofarm,
        universalSpecs: UNIVERSAL_SPECS,
        productSpecs: [
            { label: 'Purity', value: '≥ 99%' },
            { label: 'Form', value: 'White crystalline' },
            { label: 'pH (1% soln)', value: '4.0 – 6.0' },
            { label: 'Solubility', value: 'Freely soluble' },
            { label: 'Dose', value: '1–2 kg / acre' },
            { label: 'Application', value: 'Dissolve, broadcast' },
        ],
    },
];

export const COUPONS: Coupon[] = [
    { code: 'AQUA10', discount: 10, type: 'percent', description: '10% off on all orders', minOrder: 500 },
    { code: 'SAVE200', discount: 200, type: 'flat', description: '₹200 off on orders above ₹2000', minOrder: 2000 },
    { code: 'FIRST15', discount: 15, type: 'percent', description: '15% off for first-time buyers', minOrder: 300 },
];

let _orders: Order[] = [];

export const MockProductService = {
    getProducts: async (): Promise<Product[]> => {
        await new Promise(resolve => setTimeout(resolve, 400));
        return PRODUCTS;
    },

    getProductById: (id: string): Product | undefined => PRODUCTS.find(p => p.id === id),

    getCategories: (): string[] => {
        return ['All', 'Feed', 'Minerals', 'Probiotics', 'Equipment', 'Chemicals'];
    },

    applyCoupon: (code: string, subtotal: number): Coupon | null => {
        const coupon = COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());
        if (!coupon) return null;
        if (subtotal < coupon.minOrder) return null;
        return coupon;
    },

    calculateDiscount: (coupon: Coupon, subtotal: number): number => {
        if (coupon.type === 'percent') return Math.round(subtotal * coupon.discount / 100);
        return coupon.discount;
    },

    placeOrder: async (items: CartItem[], coupon: Coupon | null, address: string): Promise<Order> => {
        await new Promise(resolve => setTimeout(resolve, 800));
        const subtotal = items.reduce((sum, ci) => sum + ci.product.price * ci.qty, 0);
        const discountAmt = coupon ? MockProductService.calculateDiscount(coupon, subtotal) : 0;
        const deliveryFee = subtotal >= 2000 ? 0 : 149;
        const order: Order = {
            id: `UC${Date.now().toString().slice(-8)}`,
            items: items.map(ci => ({ product: ci.product, qty: ci.qty, price: ci.product.price })),
            subtotal,
            discount: discountAmt,
            deliveryFee,
            total: subtotal - discountAmt + deliveryFee,
            couponCode: coupon?.code,
            status: 'placed',
            placedAt: new Date().toISOString(),
            estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString(),
            address,
            trackingId: `TRK${Math.floor(Math.random() * 900000 + 100000)}`,
        };
        _orders.unshift(order);
        return order;
    },

    getOrders: (): Order[] => [..._orders],

    cancelOrder: (orderId: string): boolean => {
        const order = _orders.find(o => o.id === orderId);
        if (!order || ['shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(order.status)) return false;
        order.status = 'cancelled';
        return true;
    },
};
