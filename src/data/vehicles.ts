export interface Vehicle {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  seats: number;
  doors: number;
  luggage: number;
  transmission: 'Automatic' | 'Manual';
  fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
  features: string[];
  image: string;
  imageAlt: string;
  description: string;
  startingPricePerDay: number | null;
  isPublished: boolean;
}

export type VehicleCategory =
  | 'Luxury'
  | 'SUV'
  | 'Sedan'
  | 'Convertible'
  | 'Electric'
  | 'Premium'
  | 'Family'
  | 'Executive';

export const vehicles: Vehicle[] = [
  {
    id: 'veh-001',
    slug: 'mercedes-benz-s-class',
    make: 'Mercedes-Benz',
    model: 'S-Class',
    year: 2024,
    category: 'Luxury',
    seats: 5,
    doors: 4,
    luggage: 3,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    features: ['Leather interior', 'Massage seats', 'Panoramic roof', 'Burmeister sound', 'ADAS suite'],
    image: 'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Mercedes-Benz S-Class luxury sedan',
    description: 'The pinnacle of German engineering. The S-Class delivers uncompromising comfort, silence, and technology for the discerning executive traveler.',
    startingPricePerDay: 320,
    isPublished: true,
  },
  {
    id: 'veh-002',
    slug: 'range-rover-velar',
    make: 'Land Rover',
    model: 'Range Rover Velar',
    year: 2024,
    category: 'SUV',
    seats: 5,
    doors: 4,
    luggage: 4,
    transmission: 'Automatic',
    fuelType: 'Diesel',
    features: ['4WD', 'Terrain Response 2', 'Meridian sound', 'Heated seats', 'Panoramic roof'],
    image: 'https://images.pexels.com/photos/16374970/pexels-photo-16374970.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Range Rover Velar SUV',
    description: 'British refinement meets go-anywhere capability. The Velar is equally at home on mountain passes and city boulevards.',
    startingPricePerDay: 210,
    isPublished: true,
  },
  {
    id: 'veh-003',
    slug: 'porsche-911-carrera',
    make: 'Porsche',
    model: '911 Carrera',
    year: 2024,
    category: 'Convertible',
    seats: 4,
    doors: 2,
    luggage: 2,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    features: ['Sport mode', 'Active suspension', 'Bose sound', 'Heated seats', 'Launch control'],
    image: 'https://images.pexels.com/photos/39855/pexels-photo-39855.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Porsche 911 Carrera convertible',
    description: 'An icon of performance and style. The 911 Carrera delivers thrilling dynamics with everyday usability.',
    startingPricePerDay: 450,
    isPublished: true,
  },
  {
    id: 'veh-004',
    slug: 'tesla-model-s-plaid',
    make: 'Tesla',
    model: 'Model S Plaid',
    year: 2024,
    category: 'Electric',
    seats: 5,
    doors: 4,
    luggage: 3,
    transmission: 'Automatic',
    fuelType: 'Electric',
    features: ['1,020 hp', 'Autopilot', '17" touchscreen', 'Glass roof', 'Supercharging access'],
    image: 'https://images.pexels.com/photos/12861652/pexels-photo-12861652.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Tesla Model S Plaid electric sedan',
    description: 'The fastest production sedan ever built. Silent, sustainable, and devastatingly quick.',
    startingPricePerDay: 280,
    isPublished: true,
  },
  {
    id: 'veh-005',
    slug: 'bmw-7-series',
    make: 'BMW',
    model: '7 Series',
    year: 2024,
    category: 'Executive',
    seats: 5,
    doors: 4,
    luggage: 3,
    transmission: 'Automatic',
    fuelType: 'Hybrid',
    features: ['Executive lounge seating', 'Rear theater screen', 'Bowers & Wilkins', 'Soft-close doors', 'Air suspension'],
    image: 'https://images.pexels.com/photos/8299798/pexels-photo-8299798.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'BMW 7 Series executive sedan',
    description: 'The executive limousine redefined. Rear-seat luxury meets effortless driving dynamics.',
    startingPricePerDay: 290,
    isPublished: true,
  },
  {
    id: 'veh-006',
    slug: 'audi-q7',
    make: 'Audi',
    model: 'Q7',
    year: 2024,
    category: 'Family',
    seats: 7,
    doors: 4,
    luggage: 5,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    features: ['7 seats', 'Quattro AWD', 'Bang & Olufsen sound', 'Virtual cockpit', 'Adaptive cruise'],
    image: 'https://images.pexels.com/photos/10350940/pexels-photo-10350940.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Audi Q7 family SUV',
    description: 'Spacious, refined, and versatile. The Q7 is the ideal companion for family adventures.',
    startingPricePerDay: 175,
    isPublished: true,
  },
  {
    id: 'veh-007',
    slug: 'mercedes-benz-gle',
    make: 'Mercedes-Benz',
    model: 'GLE',
    year: 2024,
    category: 'Premium',
    seats: 5,
    doors: 4,
    luggage: 4,
    transmission: 'Automatic',
    fuelType: 'Hybrid',
    features: ['Air suspension', 'MBUX infotainment', 'Burmester sound', '360° camera', 'Wireless charging'],
    image: 'https://images.pexels.com/photos/2612925/pexels-photo-2612925.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Mercedes-Benz GLE premium SUV',
    description: 'Premium comfort meets everyday practicality. The GLE balances luxury and utility with effortless ease.',
    startingPricePerDay: 195,
    isPublished: true,
  },
  {
    id: 'veh-008',
    slug: 'jaguar-f-type',
    make: 'Jaguar',
    model: 'F-Type',
    year: 2024,
    category: 'Convertible',
    seats: 2,
    doors: 2,
    luggage: 1,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    features: ['Active exhaust', 'Sport seats', 'Meridian sound', 'Convertible soft top', 'Wet mode'],
    image: 'https://images.pexels.com/photos/18882485/pexels-photo-18882485.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Jaguar F-Type convertible sports car',
    description: 'British sports car passion in its purest form. The F-Type is a sensory celebration of driving.',
    startingPricePerDay: 380,
    isPublished: true,
  },
  {
    id: 'veh-009',
    slug: 'volvo-xc90',
    make: 'Volvo',
    model: 'XC90',
    year: 2024,
    category: 'SUV',
    seats: 7,
    doors: 4,
    luggage: 5,
    transmission: 'Automatic',
    fuelType: 'Hybrid',
    features: ['7 seats', 'Pilot Assist', 'Bowers & Wilkins', 'Air quality', 'Crystal gear shifter'],
    image: 'https://images.pexels.com/photos/9770034/pexels-photo-9770034.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Volvo XC90 luxury SUV',
    description: 'Scandinavian luxury designed around safety and serenity. The XC90 is the thoughtful family SUV.',
    startingPricePerDay: 165,
    isPublished: true,
  },
  {
    id: 'veh-010',
    slug: 'tesla-model-3',
    make: 'Tesla',
    model: 'Model 3',
    year: 2024,
    category: 'Electric',
    seats: 5,
    doors: 4,
    luggage: 3,
    transmission: 'Automatic',
    fuelType: 'Electric',
    features: ['Autopilot', '15" touchscreen', 'Glass roof', 'Supercharging access', 'Over-the-air updates'],
    image: 'https://images.pexels.com/photos/13672811/pexels-photo-13672811.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Tesla Model 3 electric sedan',
    description: 'The electric vehicle that changed the industry. Accessible, efficient, and genuinely fun to drive.',
    startingPricePerDay: 145,
    isPublished: true,
  },
  {
    id: 'veh-011',
    slug: 'lexus-lx-600',
    make: 'Lexus',
    model: 'LX 600',
    year: 2024,
    category: 'Luxury',
    seats: 5,
    doors: 4,
    luggage: 4,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    features: ['Mark Levinson sound', 'Semi-aniline leather', 'Multi-terrain monitor', 'Crawl control', 'Heated steering'],
    image: 'https://images.pexels.com/photos/6291017/pexels-photo-6291017.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Lexus LX 600 luxury SUV',
    description: 'Japanese luxury at its most commanding. The LX 600 combines rugged capability with opulent comfort.',
    startingPricePerDay: 340,
    isPublished: true,
  },
  {
    id: 'veh-012',
    slug: 'audi-a6',
    make: 'Audi',
    model: 'A6',
    year: 2024,
    category: 'Sedan',
    seats: 5,
    doors: 4,
    luggage: 3,
    transmission: 'Automatic',
    fuelType: 'Hybrid',
    features: ['Virtual cockpit plus', 'Bang & Olufsen 3D', 'Matrix LED headlights', 'Adaptive air suspension', 'Wireless CarPlay'],
    image: 'https://images.pexels.com/photos/8299987/pexels-photo-8299987.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    imageAlt: 'Audi A6 sedan',
    description: 'Understated elegance with cutting-edge technology. The A6 is the benchmark for the modern executive sedan.',
    startingPricePerDay: 160,
    isPublished: true,
  },
];

export function getPublishedVehicles(): Vehicle[] {
  return vehicles.filter((v) => v.isPublished);
}

export function getVehicleBySlug(slug: string): Vehicle | undefined {
  return vehicles.find((v) => v.slug === slug);
}

export function getVehiclesByCategory(category: VehicleCategory): Vehicle[] {
  return vehicles.filter((v) => v.category === category && v.isPublished);
}

export function getFeaturedVehicles(): Vehicle[] {
  return vehicles.filter((v) => v.isPublished).slice(0, 6);
}

export function getVehicleCategories(): VehicleCategory[] {
  const cats = new Set<VehicleCategory>();
  vehicles.forEach((v) => {
    if (v.isPublished) cats.add(v.category);
  });
  return Array.from(cats).sort();
}
