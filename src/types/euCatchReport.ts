interface ICatchSubmissionValidationError {
  id: string;
  field: string;
  message: string;
}

interface ICatchSubmissionFailure {
  documentNumber: string;
  timestamp?: string;
  code?: string;
  message?: string;
  validationErrors: ICatchSubmissionValidationError[];
}

export interface ICatchSubmissionStatsResult {
  documentType: string;
  dateFrom: string;
  dateTo: string;
  successCount: number;
  failureCount: number;
  failures: ICatchSubmissionFailure[];
}