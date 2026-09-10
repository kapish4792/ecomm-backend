import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESS SCHEMAS — Zod validation matching Prisma Address model
// ─────────────────────────────────────────────────────────────────────────────

export const AddressTypeEnum = z.enum(['HOME', 'WORK', 'OTHER']);

export const CreateAddressSchema = z.object({
  body: z.object({
    fullName:     z.string().trim().min(1, 'Full name is required'),
    phone:        z.string().trim().min(1, 'Phone number is required'),
    addressLine1: z.string().trim().min(1, 'Address line 1 is required'),
    addressLine2: z.string().trim().optional(),
    landmark:     z.string().trim().optional(),
    city:         z.string().trim().min(1, 'City is required'),
    state:        z.string().trim().min(1, 'State is required'),
    country:      z.string().trim().min(1, 'Country is required'),
    postalCode:   z.string().trim().min(1, 'Postal code is required'),
    type:         AddressTypeEnum.optional().default('HOME'),
    isDefault:    z.boolean().optional().default(false),
  }),
});

export const UpdateAddressSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Address ID is required'),
  }),
  body: z.object({
    fullName:     z.string().trim().min(1, 'Full name cannot be empty').optional(),
    phone:        z.string().trim().min(1, 'Phone number cannot be empty').optional(),
    addressLine1: z.string().trim().min(1, 'Address line 1 cannot be empty').optional(),
    addressLine2: z.string().trim().optional(),
    landmark:     z.string().trim().optional(),
    city:         z.string().trim().min(1, 'City cannot be empty').optional(),
    state:        z.string().trim().min(1, 'State cannot be empty').optional(),
    country:      z.string().trim().min(1, 'Country cannot be empty').optional(),
    postalCode:   z.string().trim().min(1, 'Postal code cannot be empty').optional(),
    type:         AddressTypeEnum.optional(),
    isDefault:    z.boolean().optional(),
  }),
});

export const GetAddressSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Address ID is required'),
  }),
});

export const DeleteAddressSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Address ID is required'),
  }),
});

export const SetDefaultAddressSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Address ID is required'),
  }),
});

export type CreateAddressInput = z.infer<typeof CreateAddressSchema>['body'];
export type UpdateAddressInput = z.infer<typeof UpdateAddressSchema>['body'];
