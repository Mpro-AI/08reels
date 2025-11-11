export type User = {
  id: string; // Firebase Auth UID
  name: string;
  email?: string | null;
  photoURL?: string | null;
  role?: 'admin' | 'employee';
};

export type Comment = {
  id: string;
  timecode: number;
  timecodeFormatted: string;
  text: string;
  author: User;
  createdAt: string;
};

export type PenAnnotationData = {
  path: { x: number, y: number }[];
  color: string;
  lineWidth: number;
};

export type ImageAnnotationData = {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in radians
};

export type Annotation = {
    id: string;
    type: 'pen' | 'image';
    data: PenAnnotationData | ImageAnnotationData;
    author: Pick<User, 'id' | 'name'>;
    createdAt: string;
    timecode: number;
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
  notes?: string;
};

export type Video = {
  id: string;
  title: string;
  thumbnailUrl: string;
  thumbnailHint: string;
  author: Pick<User, 'id' | 'name'>;
  uploadedAt: string;
  versions: Version[];
  videoUrl: string; // The URL of the currently active video version for quick access
};
