import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
  'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
];

async function main() {
  console.log('Seeding DoubleA Commerce database...');

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const userHash = await bcrypt.hash('User123!', 12);
  const companyHash = await bcrypt.hash('Company123!', 12);
  const deliveryHash = await bcrypt.hash('Delivery123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@doublea.com' },
    update: {},
    create: {
      email: 'admin@doublea.com',
      passwordHash,
      fullName: 'Admin User',
      phone: '+1234567890',
      role: 'admin',
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'user@doublea.com' },
    update: {},
    create: {
      email: 'user@doublea.com',
      passwordHash: userHash,
      fullName: 'John Customer',
      phone: '+1234567891',
      role: 'normal_user',
    },
  });

  const companyUser = await prisma.user.upsert({
    where: { email: 'company@doublea.com' },
    update: {},
    create: {
      email: 'company@doublea.com',
      passwordHash: companyHash,
      fullName: 'Sarah Business',
      phone: '+1234567892',
      role: 'company',
      companyProfile: {
        create: {
          companyName: 'TechCorp Solutions',
          vatNumber: 'VAT-123456789',
          businessAddress: '100 Business Park, Suite 200, New York, NY',
          contactPerson: 'Sarah Business',
          companyPhone: '+1234567892',
          status: 'approved',
        },
      },
    },
  });

  const deliveryAgent = await prisma.user.upsert({
    where: { email: 'delivery@doublea.com' },
    update: {},
    create: {
      email: 'delivery@doublea.com',
      passwordHash: deliveryHash,
      fullName: 'Mike Driver',
      phone: '+1234567893',
      role: 'delivery_agent',
    },
  });

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Latest gadgets and devices',
        imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'fashion' },
      update: {},
      create: {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Trendy clothing and accessories',
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'home-kitchen' },
      update: {},
      create: {
        name: 'Home & Kitchen',
        slug: 'home-kitchen',
        description: 'Everything for your home',
        imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'sports' },
      update: {},
      create: {
        name: 'Sports & Outdoors',
        slug: 'sports',
        description: 'Gear up for adventure',
        imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ad9381?w=400',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'beauty' },
      update: {},
      create: {
        name: 'Beauty & Personal Care',
        slug: 'beauty',
        description: 'Look and feel your best',
        imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
      },
    }),
  ]);

  const productsData = [
    { name: 'Premium Wireless Headphones', slug: 'premium-wireless-headphones', brand: 'SoundMax', normalPrice: 149.99, companyPrice: 119.99, category: 0, featured: true },
    { name: 'Smart Watch Pro', slug: 'smart-watch-pro', brand: 'TechTime', normalPrice: 299.99, companyPrice: 249.99, category: 0, featured: true },
    { name: 'Bluetooth Speaker', slug: 'bluetooth-speaker', brand: 'AudioWave', normalPrice: 79.99, companyPrice: 64.99, category: 0, featured: false },
    { name: '4K Action Camera', slug: '4k-action-camera', brand: 'GoShot', normalPrice: 199.99, companyPrice: 169.99, category: 0, featured: true },
    { name: 'Wireless Earbuds', slug: 'wireless-earbuds', brand: 'SoundMax', normalPrice: 89.99, companyPrice: 74.99, category: 0, featured: false },
    { name: 'Classic Denim Jacket', slug: 'classic-denim-jacket', brand: 'UrbanStyle', normalPrice: 89.99, companyPrice: 72.99, category: 1, featured: true },
    { name: 'Running Sneakers', slug: 'running-sneakers', brand: 'SpeedRun', normalPrice: 129.99, companyPrice: 99.99, category: 1, featured: true },
    { name: 'Leather Crossbody Bag', slug: 'leather-crossbody-bag', brand: 'LuxeCarry', normalPrice: 159.99, companyPrice: 129.99, category: 1, featured: false },
    { name: 'Cotton T-Shirt Pack', slug: 'cotton-tshirt-pack', brand: 'BasicWear', normalPrice: 39.99, companyPrice: 29.99, category: 1, featured: false },
    { name: 'Sunglasses Classic', slug: 'sunglasses-classic', brand: 'SunShield', normalPrice: 69.99, companyPrice: 54.99, category: 1, featured: false },
    { name: 'Stainless Steel Cookware Set', slug: 'cookware-set', brand: 'ChefPro', normalPrice: 249.99, companyPrice: 199.99, category: 2, featured: true },
    { name: 'Coffee Maker Deluxe', slug: 'coffee-maker-deluxe', brand: 'BrewMaster', normalPrice: 119.99, companyPrice: 94.99, category: 2, featured: true },
    { name: 'Robot Vacuum Cleaner', slug: 'robot-vacuum', brand: 'CleanBot', normalPrice: 349.99, companyPrice: 289.99, category: 2, featured: false },
    { name: 'Air Fryer Pro', slug: 'air-fryer-pro', brand: 'KitchenTech', normalPrice: 89.99, companyPrice: 74.99, category: 2, featured: false },
    { name: 'Memory Foam Pillow', slug: 'memory-foam-pillow', brand: 'SleepWell', normalPrice: 49.99, companyPrice: 39.99, category: 2, featured: false },
    { name: 'Yoga Mat Premium', slug: 'yoga-mat-premium', brand: 'FlexFit', normalPrice: 34.99, companyPrice: 27.99, category: 3, featured: false },
    { name: 'Camping Tent 4-Person', slug: 'camping-tent-4', brand: 'OutdoorPro', normalPrice: 179.99, companyPrice: 149.99, category: 3, featured: true },
    { name: 'Fitness Tracker Band', slug: 'fitness-tracker-band', brand: 'FitLife', normalPrice: 59.99, companyPrice: 47.99, category: 3, featured: false },
    { name: 'Skincare Set Deluxe', slug: 'skincare-set-deluxe', brand: 'GlowUp', normalPrice: 79.99, companyPrice: 64.99, category: 4, featured: true },
    { name: 'Electric Toothbrush', slug: 'electric-toothbrush', brand: 'DentalCare', normalPrice: 69.99, companyPrice: 54.99, category: 4, featured: false },
    { name: 'Hair Dryer Professional', slug: 'hair-dryer-pro', brand: 'StylePro', normalPrice: 89.99, companyPrice: 72.99, category: 4, featured: false },
    { name: 'Perfume Collection', slug: 'perfume-collection', brand: 'Essence', normalPrice: 129.99, companyPrice: 99.99, category: 4, featured: false },
  ];

  const products = [];
  for (let i = 0; i < productsData.length; i++) {
    const p = productsData[i];
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        categoryId: categories[p.category].id,
        name: p.name,
        slug: p.slug,
        description: `High-quality ${p.name.toLowerCase()} from ${p.brand}. Perfect for everyday use with premium materials and excellent craftsmanship.`,
        normalPrice: p.normalPrice,
        companyPrice: p.companyPrice,
        stockQuantity: 50 + Math.floor(Math.random() * 100),
        sku: `DA-${String(i + 1).padStart(4, '0')}`,
        brand: p.brand,
        imageUrl: PRODUCT_IMAGES[i % PRODUCT_IMAGES.length],
        ratingAverage: 3.5 + Math.random() * 1.5,
        ratingCount: Math.floor(Math.random() * 200) + 10,
        isFeatured: p.featured,
        images: {
          create: [
            { imageUrl: PRODUCT_IMAGES[i % PRODUCT_IMAGES.length], sortOrder: 0 },
            { imageUrl: PRODUCT_IMAGES[(i + 1) % PRODUCT_IMAGES.length], sortOrder: 1 },
          ],
        },
      },
    });
    products.push(product);
  }

  const address = await prisma.address.upsert({
    where: { id: '11111111-1111-4111-8111-111111111101' },
    update: {},
    create: {
      id: '11111111-1111-4111-8111-111111111101',
      userId: normalUser.id,
      label: 'Home',
      fullName: 'John Customer',
      phone: '+1234567891',
      country: 'USA',
      city: 'New York',
      street: '123 Main Street',
      building: 'Apt 4B',
      postalCode: '10001',
      latitude: 40.7128,
      longitude: -74.006,
      isDefault: true,
    },
  });

  await prisma.address.upsert({
    where: { id: '11111111-1111-4111-8111-111111111102' },
    update: {},
    create: {
      id: '11111111-1111-4111-8111-111111111102',
      userId: companyUser.id,
      label: 'Office',
      fullName: 'Sarah Business',
      phone: '+1234567892',
      country: 'USA',
      city: 'New York',
      street: '100 Business Park',
      building: 'Suite 200',
      postalCode: '10002',
      latitude: 40.758,
      longitude: -73.9855,
      isDefault: true,
    },
  });

  await prisma.banner.createMany({
    data: [
      { title: 'Summer Sale', subtitle: 'Up to 40% off electronics', imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800', sortOrder: 0 },
      { title: 'New Arrivals', subtitle: 'Discover the latest trends', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', sortOrder: 1 },
      { title: 'Free Delivery', subtitle: 'On orders over $50', imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800', sortOrder: 2 },
    ],
    skipDuplicates: true,
  });

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      minOrderAmount: 30,
      isActive: true,
      startsAt: new Date('2024-01-01'),
      expiresAt: new Date('2027-12-31'),
    },
  });

  const order1 = await prisma.order.upsert({
    where: {
      orderNumber: "DA-SEED-001",
    },
    update: {},
    create: {
      orderNumber: 'DA-SEED-001',
      userId: normalUser.id,
      addressId: address.id,
      deliveryAgentId: deliveryAgent.id,
      status: 'assigned',
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'unpaid',
      subtotal: 229.98,
      deliveryFee: 5.99,
      discountAmount: 0,
      taxAmount: 18.4,
      totalAmount: 254.37,
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            quantity: 1,
            unitPrice: 149.99,
            selectedPriceType: 'normal',
            totalPrice: 149.99,
          },
          {
            productId: products[2].id,
            productName: products[2].name,
            quantity: 1,
            unitPrice: 79.99,
            selectedPriceType: 'normal',
            totalPrice: 79.99,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: 'pending', note: 'Order placed' },
          { status: 'confirmed', note: 'Order confirmed' },
          { status: 'assigned', note: `Assigned to ${deliveryAgent.fullName}` },
        ],
      },
    },
  });

  await prisma.order.upsert({
    where: {
      orderNumber: "DA-SEED-002",
    },
    update: {},
    create: {
      orderNumber: 'DA-SEED-002',
      userId: normalUser.id,
      addressId: address.id,
      deliveryAgentId: deliveryAgent.id,
      status: 'delivered',
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'paid',
      subtotal: 129.99,
      deliveryFee: 5.99,
      discountAmount: 0,
      taxAmount: 10.4,
      totalAmount: 146.38,
      items: {
        create: [
          {
            productId: products[6].id,
            productName: products[6].name,
            quantity: 1,
            unitPrice: 129.99,
            selectedPriceType: 'normal',
            totalPrice: 129.99,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: 'pending', note: 'Order placed' },
          { status: 'delivered', note: 'Delivered successfully' },
        ],
      },
      deliveryProof: {
        create: {
          deliveryAgentId: deliveryAgent.id,
          deliveredToName: 'John Customer',
          deliveryNote: 'Left at front door',
        },
      },
    },
  });

  console.log('Seed completed successfully!');
  console.log('Demo accounts:');
  console.log('  Admin: admin@doublea.com / Admin123!');
  console.log('  User: user@doublea.com / User123!');
  console.log('  Company: company@doublea.com / Company123!');
  console.log('  Delivery: delivery@doublea.com / Delivery123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
