// Types for mock storage
export interface FileUpload {
  content: Buffer;
  filename: string;
  contentType: string;
}

export interface FormFields {
  [key: string]: string;
}

export interface MultipartFormData {
  files: { [key: string]: FileUpload };
  fields: FormFields;
}