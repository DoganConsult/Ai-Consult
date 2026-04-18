// @dos/types - Bounded Shared Types
// Extracts the legacy schema into shared data models.

export * from './erp';

export type LocaleLang = 'en' | 'ar' | 'tr' | string;

export interface BaseInquiryModel {
  id?: string;
  name: string;
  email: string;
  message?: string;
  lang?: LocaleLang;
  createdAt?: Date | string;
}

export interface ConsultationModel extends BaseInquiryModel {
  type: 'advisory' | 'proposal';
  organization?: string;
  phone?: string;
  serviceArea?: string;
}

export interface ContactModel extends BaseInquiryModel {
  subject?: string;
}

// Bounded representations for tenant metadata injection at runtime
export interface TenancyBounds {
  tenantId: string;
  userId?: string;
}
