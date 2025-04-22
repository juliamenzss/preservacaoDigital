export class FilterDocumentDto {
  userId: string;
  name?: string;
  category?: string;
  keywords?: string;
  description?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: 'INICIADA' | 'PRESERVADO' | 'FALHA';
}
