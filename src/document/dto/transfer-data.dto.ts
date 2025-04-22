export interface TransferData {
    name: string;
    type: 'standard' | 'zipped' | 'unzipped' | 'dspace';
    accession?: string;
    paths: string[];
    row_ids?: string[];
}