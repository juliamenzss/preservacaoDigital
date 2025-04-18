export class FilterDocumentDto {
  userId: string;
  name?: string;
  category?: string;
  keywords?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: 'INICIADA' | 'PRESERVADO' | 'FALHA';
}
