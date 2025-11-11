export type UserRole = 'admin' | 'employee';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  pin?: string;
};

export type Comment = {
  id: string;
  timecode: number;
  timecodeFormatted: string;
  text: string;
  author: Pick<User, 'id' | 'name'>;
  createdAt: string;
};

export type Annotation = {
    id: string;
    type: 'pen' | 'text' | 'image';
    data: any; // Could be path for pen, text content, image url etc.
    author: Pick<User, 'id' | 'name'>;
    createdAt: string;
}

export type VersionStatus = 'pending_review' | 'needs_changes' | 'approved' | 'rejected';

export type Version = {
  id:string;
  versionNumber: number;
  status: VersionStatus;
  createdAt: string;
  uploader: Pick<User, 'id' | 'name'>;
  comments: Comment[];
  annotations: Annotation[];
  isCurrentActive: boolean;
  videoUrl: string;
};

export type Video = {
  id: string;
  title: string;
  thumbnailUrl: string;
  thumbnailHint: string;
  assignedTo: Pick<User, 'id' | 'name'>;
  uploadedAt: string;
  versions: Version[];
  videoUrl: string; // The URL of the currently active video version for quick access
};
