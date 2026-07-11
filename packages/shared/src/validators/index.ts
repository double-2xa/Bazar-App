import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
});

export const registerCompanySchema = registerSchema.extend({
  companyName: z.string().min(2, 'Company name is required'),
  vatNumber: z.string().min(2, 'VAT number is required'),
  businessAddress: z.string().min(5, 'Business address is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  companyPhone: z.string().min(5, 'Company phone is required'),
});

export const addressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(5, 'Phone is required'),
  country: z.string().min(2, 'Country is required'),
  city: z.string().min(2, 'City is required'),
  street: z.string().min(2, 'Street is required'),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  postalCode: z.string().min(3, 'Postal code is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().optional(),
});

export const createOrderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(['cash_on_delivery', 'card']).default('cash_on_delivery'),
  customerNote: z.string().optional(),
  couponCode: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        selectedPriceType: z.enum(['normal', 'company']).default('normal'),
      }),
    )
    .min(1),
});

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const productSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string(),
  normalPrice: z.number().positive(),
  companyPrice: z.number().positive(),
  stockQuantity: z.number().int().min(0),
  sku: z.string().min(1),
  brand: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const couponSchema = z.object({
  code: z.string().min(3),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minOrderAmount: z.number().min(0).default(0),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const deliveryProofSchema = z.object({
  deliveredToName: z.string().optional(),
  deliveryNote: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const deliveryRejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type DeliveryProofInput = z.infer<typeof deliveryProofSchema>;
export type DeliveryRejectInput = z.infer<typeof deliveryRejectSchema>;
