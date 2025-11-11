import { User, Video } from '@/lib/types';

export const users: User[] = [
  { id: 'user-1', name: 'Admin User', role: 'admin' },
  { id: 'user-2', name: '員工 A', role: 'employee' },
  { id: 'user-3', name: '員工 B', role: 'employee' },
];

export const videos: Video[] = [
  {
    id: 'video-1',
    title: '夏季新品廣告',
    thumbnailUrl: 'https://picsum.photos/seed/101/400/225',
    thumbnailHint: 'abstract cinematic',
    assignedTo: users[1],
    uploadedAt: '2024-05-20T10:00:00Z',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    // A tiny, 1-second blank video encoded in base64, for use with the AI flow.
    videoDataUri: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAyhianV1a21kYXQAAAUueGdiBg4sAD5YgAJg/v+QAgO2AAD9D0AOb14sAAAAAABtb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAAAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAGGlvZHMAAAAAEwAACAEAAAAAAQAAA+gAAAAAAAABdnJhawAAAFRraGQAAAAPAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAdW1kNwAAAAAAQG1kaWEAAAAgbWRoZAAAAAAAAAAAAAAAAAAAygAAAAAAVQh1ZWxyAAAAAQAAAEhtZGF0AAAAAgAAAAD//9//+3//9//9//3//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//9//9//f//9//+1//9//9//9//f//9//+3//9//gAAAABtaW5mAAAAAFZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAADTc3RibAAAAL9zdHNkAAAAAAAAAAEAAACfYXZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAdW1kbgAAADIAAAACAAgAFgA+////AAEACH//bWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEbWMEb-PDUAGBGQABoACAAFgA+sAAAF//+0ADEFMRgBAAAABBtZWIwLWF2YzEgcmVlcyA4IEhETVcgZm9yIEhUVFAgc3RyZWFtaW5nAC0gYSBzdHJlYW0gd2l0aCBtdWx0aXBsZSBtb2YgYW5kIGJveCBpbiBpdAAAAvRhdmMxAQAAAAAA//8AAAAzYXZjQwCggAAX/+4ADmd2Y2xhdmNGdW5kYwAAAAACDEIAAAMoZ2FzcAAAAAABAAAADGFwY2wBAAAAAAIAAgB4AAAADGFwY24BAAAAABQAAABgAAAADGFwY2kBAAAANgAAACRhdmNDAgAAABIAAAAYAAAADGljcGwBAAAAMAAAAENvbXBvbmVudCAyAAAAAAABAAAAAmFwY2MB/////wAAAAlhcGNvAgAAAAAAAAAAAAAAC2FwY24BAAAAAAAAAAAAAAAACGFwY2kBAAAAAAAAAAAAAAAAAAABAAAABmFwY28CAAAAAAAAAAAAAAAKYXBYIAAAAAAA4wAQeAAAH2AP+8/gLTAJpgAE8yQAAAAAECgAAB2YADQ8PDS4AAAAABv//+wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdHJhbnNmb3JtX3Bhc3NlZAAAAABwbGMuYXZjLzEwMi4xLjEzAAAAAFBhc3NlZC1hc3BlY3QtcmF0aW8xLjc3Nzc3OC4gUGFzc2VkLWFzcGVjdC1yYXRpbzEuNzc3Nzc4AAAAAQAAABxhdmNTdWJTYW1wbGVzUmFuZ2UuYXZjLzYxNDQwAAAAAGNvbG91ci5hdmMvMTIuMTIuMTIuMAAAAAByZWN0LmF2Yy8yNDAuMC4xMzUuMC4yNDAuMC4xMzUuMAAAAGJ1ZGdlLmF2Yy8xNTcuMTU5Ljg0Ljc2Ljc5Ljc2AAAAAXdpZHRoLmF2Yy8yNDAuaW50AAAAAGhlaWdodC5hdmMvMTM1LmludAAAAABzdHJlYW1fbGFuZ3VhZ2UuYXZjL3VuZAAAAABwaXhlbF9mb3JtYXQuYXZjL3VuazQyMgAAAAD/8AAAEGF2Y0Q4aXAADf/uAA5nZDAxNjM1MjU2ZDYAAAAAAAAAAAAAWWMAAAABAAAAgAAAAAABAAAAZAAAAAG+AAAAAwABAAQACQATACgAPgBUAGIAcQB7AIgAkgCbAKUAsADAAOsBCAEZASEBKwFCAVcBaAGYAecCDgIiAiwCPgLMAv0DIwNTA4cDwQP+BLIE4gUUBUYFIAYKBicGOAbdBxwHJgecB/AIUgkGCVoJmQnkCg4KTApcCncKkAqICpwKxgrQCvoLKwswC2sLlguvC9QL+gwMDLsM5QzyDQYNFA08DWwNgA2uDdQN9A4WDkoOVQ5vDoYOkQ6gDrYPCQ8VDzwPZw+GD6APxw/aEAAQFhBPEGUQchCGEIgQiRCLEI4QkBCWEJkQnxCgEKcQqxCtELIQuxC+EMYQyBDNENQQ1BC7EMwQzRDnEP8RAhEeESgRMhE4ET4RThFbEWMRexH+Eg4SIhIqEjYSPBJOElgSYhJyEn4ShBKKEpsSoBKmEqsStBK6EsISyhLSEtoS8hL+EwYTDhMaEyQTKhMuEz4TRhNaE2ITahN2E3wThBNKE5YToROqE7ITuxPDE9kT4RPiE/QT+hQCFEUUWhRiFGoUchR6FIIUihSTEpgSqRKqErYSwxLSEucS9xMIExYTKBMeEyYTKBMuEzATNhM+E0oTVhNqE3YThxOKE5kToROqE7QTuhPDE9oT5BP+FAYUihSaFJwUoBSmFLIUvhTJFP4VChUKFYYVihWOFZYVnBWkFaQVshW+FcYV1hXcFd4V/hYCFg4WFhYqFi4WPhZGFpYWYhaaFoAWihacFqoWsBa2FsoW7hb2FwAXDBcWFigWLxY+FkoWYRZyFn4WhhaOFpoWqha0FsoW3BcIFwwXIBclFz8XRhdhF38XhReVF6EXvBfBF80X1hfyGAIYCBgJGAwYDxgnGC4YRhhdGGkYexiLGI0YlBieGKcYsBjBGMoY2hjzGQUZDRkVGRkZJBlBGUYZaRl5GYkZjRmcGaUZrBmsGa4ZvBnIGcwd0B3hHfcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJtZXRhAAAAAAAAACRoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAARZGF0YQAAAAEAAAAAMGZyZWUAAAMobWRhdAAAAAUueGdiBg4sAD5YgAJg/v+QAgO2AAD9D0AOb14sAAAAAABzZHRwAAAAAAAAAAEBAQEBQCAAAAACAQEBgA==',
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
    thumbnailUrl: 'https://picsum.photos/seed/102/400/225',
    thumbnailHint: 'city night',
    assignedTo: users[2],
    uploadedAt: '2024-05-18T09:00:00Z',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
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
    thumbnailUrl: 'https://picsum.photos/seed/103/400/225',
    thumbnailHint: 'nature mountains',
    assignedTo: users[1],
    uploadedAt: '2024-05-15T16:00:00Z',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
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
    thumbnailUrl: 'https://picsum.photos/seed/104/400/225',
    thumbnailHint: 'technology circuit',
    assignedTo: users[2],
    uploadedAt: '2024-05-22T11:30:00Z',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
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
