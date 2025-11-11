import { User, Video } from '@/lib/types';
import { PlaceHolderImages } from './placeholder-images';

export const users: User[] = [
  { id: 'user-1', name: 'Admin User', role: 'admin' },
  { id: 'user-2', name: '員工 A', role: 'employee' },
  { id: 'user-3', name: '員工 B', role: 'employee' },
];

const videoDataUri = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAyhianV1a21kYXQAAAUueGdiBg4sAD5YgAJg/v+QAgO2AAD9D0AOb14sAAAAAABtb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAAAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAGGlvZHMAAAAAEwAACAEAAAAAAQAAA+gAAAAAAAABdnJhawAAAFRraGQAAAAPAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAdW1kNwAAAAAAQG1kaWEAAAAgbWRoZAAAAAAAAAAAAAAAAAAAygAAAAAAVQh1ZWxyAAAAAQAAAEhtZGF0AAAAAgAAAAD//9//+3//9//9//3//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9/gAAAABtaW5mAAAAAFZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAADTc3RibAAAAL9zdHNkAAAAAAAAAAEAAACfYXZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAdW1kbgAAADIAAAACAAgAFgA+////AAEACH//bWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEb-';
export const videos: Video[] = [
  {
    id: 'video-1',
    title: '新品發表會預告',
    thumbnailUrl: PlaceHolderImages[0].imageUrl,
    thumbnailHint: PlaceHolderImages[0].imageHint,
    assignedTo: users[1],
    uploadedAt: '2024-05-20T10:00:00Z',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoDataUri: videoDataUri,
    versions: [
      {
        id: 'ver-1',
        versionNumber: 1,
        status: 'approved',
        createdAt: '2024-05-20T10:00:00Z',
        uploader: users[1],
        isCurrentActive: true,
        comments: [
          {
            id: 'comment-1',
            timecode: 15,
            timecodeFormatted: '00:00:15',
            text: '這個鏡頭的色調可以再暖一點嗎？',
            author: users[0],
            createdAt: '2024-05-20T14:30:00Z',
          },
          {
            id: 'comment-2',
            timecode: 42,
            timecodeFormatted: '00:00:42',
            text: 'Logo 出現的時間太短了，建議延長 2 秒。',
            author: users[0],
            createdAt: '2024-05-20T14:32:00Z',
          },
        ],
        annotations: [],
      },
      {
        id: 'ver-2',
        versionNumber: 2,
        status: 'pending_review',
        createdAt: '2024-05-21T11:00:00Z',
        uploader: users[1],
        isCurrentActive: false,
        comments: [],
        annotations: [],
      },
    ],
  },
  {
    id: 'video-2',
    title: '企業內部訓練影片',
    thumbnailUrl: PlaceHolderImages[1].imageUrl,
    thumbnailHint: PlaceHolderImages[1].imageHint,
    assignedTo: users[2],
    uploadedAt: '2024-05-18T09:00:00Z',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    videoDataUri: videoDataUri,
    versions: [
        {
          id: 'ver-3',
          versionNumber: 1,
          status: 'pending_review',
          createdAt: '2024-05-18T09:00:00Z',
          uploader: users[2],
          isCurrentActive: true,
          comments: [
            {
                id: 'comment-3',
                timecode: 30,
                timecodeFormatted: '00:00:30',
                text: '背景音樂聲音有點太大，請調小聲一點。',
                author: users[0],
                createdAt: '2024-05-18T16:00:00Z',
              }
          ],
          annotations: [],
        },
      ],
  },
  {
    id: 'video-3',
    title: '產品發表會開場',
    thumbnailUrl: PlaceHolderImages[2].imageUrl,
    thumbnailHint: PlaceHolderImages[2].imageHint,
    assignedTo: users[1],
    uploadedAt: '2024-05-15T16:00:00Z',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    videoDataUri: videoDataUri,
    versions: [
      {
        id: 'ver-4',
        versionNumber: 1,
        status: 'approved',
        createdAt: '2024-05-15T16:00:00Z',
        uploader: users[1],
        isCurrentActive: true,
        comments: [],
        annotations: [],
      },
    ],
  },
  {
    id: 'video-4',
    title: '社群媒體短片系列',
    thumbnailUrl: PlaceHolderImages[3].imageUrl,
    thumbnailHint: PlaceHolderImages[3].imageHint,
    assignedTo: users[2],
    uploadedAt: '2024-05-22T11:30:00Z',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoDataUri: videoDataUri,
    versions: [
      {
        id: 'ver-5',
        versionNumber: 1,
        status: 'needs_changes',
        createdAt: '2024-05-22T11:30:00Z',
        uploader: users[2],
        isCurrentActive: true,
        comments: [
            {
                id: 'comment-4',
                timecode: 8,
                timecodeFormatted: '00:00:08',
                text: '這個轉場效果有點太突兀了。',
                author: users[0],
                createdAt: '2024-05-22T15:00:00Z',
              }
        ],
        annotations: [],
      },
    ],
  },
];

    