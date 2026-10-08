# SnapShare Scaling Plan

## Assumptions
- 10,000,000 registered users
- 10% are active each day, so daily active users (DAU) = 1,000,000
- Each active user uploads 1 photo and views 50 feed pages per day
- An average photo is 2 MB, plus a 50 KB thumbnail
- One day is about 100,000 seconds (rounded from 86,400 for easy maths)
- Peak traffic is 5 times the average

## Estimates
Uploads:     1,000,000 per day ÷ 100,000     = 10 per second
             Peak (x5)                       = 50 per second

Feed views:  1,000,000 x 50 = 50,000,000 per day
             50,000,000 ÷ 100,000            = 500 per second
             Peak (x5)                       = 2,500 per second

Storage:     Originals:   1,000,000 x 2 MB   = 2 TB per day
             Thumbnails:  1,000,000 x 50 KB  = 50 GB per day
             Per year:    originals ~730 TB, thumbnails ~18 TB
             Total                           = ~750 TB per year

## Read-heavy or write-heavy?
There are about 500 feed views per second but only 10 uploads per second, a ratio of about 50 to 1.
So SnapShare is read-heavy.
That means the design should serve photo media via a CDN, store feed data in an in-memory cache, and use read replicas, so that most reads never reach the primary database.

## Why photos are not stored in the database
-Size: about 2 TB of new photos every day would make the database huge.
-Speed: a huge database is slower to query, back up and copy to replicas.
-Cost: database storage costs more than storage built for files.
-Serving: a CDN can read files from file storage easily, not from a database.
-Where they go instead: object storage (such as Amazon S3), with only the photo's location and details (owner, caption, time) kept in the database.

## Architecture diagram
  ┌───────────────┐   DNS lookup    ┌─────────┐
  │ Browser /     │ ──────────────> │   DNS   │
  │ mobile app    │                 └─────────┘
  └───┬───────┬───┘
      │       │  static files + photos + thumbnails
      │       v
      │   ┌─────────┐   cache miss only   ┌─────────────────┐
      │   │   CDN   │ ──────────────────> │ Object storage  │
      │   └─────────┘                     │ (photo files)   │
      │                                   └─────────────────┘
      │ API calls (HTTPS, JSON)
      v
  ┌───────────────┐
  │ Load balancer │
  └───────┬───────┘
    ┌─────┴──────┬────────────┐
    v            v            v
┌───────┐    ┌───────┐    ┌───────┐   ┌───────────────┐
│ App 1 │    │ App 2 │    │ App 3 │──>│ Cache (Redis) │
└───┬───┘    └───┬───┘    └───┬───┘   └───────────────┘
    │ writes     │ reads      │ jobs
    v            v            v
┌─────────┐  ┌──────────┐  ┌───────┐   ┌────────┐
│ Primary │─>│ Read     │  │ Queue │──>│ Worker │
│   DB    │  │ replica  │  └───────┘   └────────┘
└─────────┘  └──────────┘
```
- App servers also save the original photo to object storage during an upload.
- The worker reads the original from object storage and saves the thumbnail back to it.

## What each component does
- The CDN solves the problem of photos and files being far from users, which makes pages slow by caching content at edge locations closer to the user.
- The Load balancer solves the problem of one server being unable to handle the traffic, or being a single point of failure by distributing incoming requests across multiple app servers.
- The App servers solve the problem of needing something to run the API, kept stateless so any server can take any request by processing application logic and delegating heavy tasks.
- The Cache solves the problem of the database being overwhelmed by about 500 reads per second by storing frequently accessed feed data in memory.
- The Database + read replica solves the problem of needing reliable storage for details, with replicas sharing the read load and acting as a backup by separating write operations from read queries.
- The Object storage solves the problem of photo files being too big for the database by storing unstructured media files efficiently outside the main database.
- The Queue + worker solves the problem of thumbnail-making being slow, so the user shouldn't wait for it by processing image generation asynchronously in the background.

## Upload flow
1. The user selects a photo, and the client application sends the upload request to the load balancer over HTTPS.
2. The load balancer routes the incoming request to an available, healthy app server.
3. The app server authenticates the user's token and validates the photo file's size and format.
4. The app server saves the original high-resolution photo directly to object storage.
5. The app server inserts a new metadata record (owner ID, caption, timestamp, and original photo URL) into the primary database.
6. The app server pushes a "make thumbnail" job onto the message queue.
7. The app server returns a 201 Created response back to the user immediately so they do not have to wait for image processing.
8. A background worker pulls the job from the queue, retrieves the original photo from object storage, generates the 50 KB thumbnail, and saves the thumbnail back to object storage.
9. The worker updates the database record with the newly generated thumbnail's location URL.
10. When followers refresh their feed, both the photos and thumbnails are delivered directly from the CDN.

## Trade-offs
- **Trade-off:** Speed vs freshness. **Gain:** Feed loading speed is dramatically improved by using in-memory caches and read replicas. **Cost:** A follower might not see a user's newly uploaded photo for a few seconds until the cache expires or database replication completes.
- **Trade-off:** Simplicity vs scalability. **Gain:** Keeps photo upload responses immediate by offloading heavy thumbnail creation to background workers. **Cost:** Increases system complexity by requiring a message queue, background workers, and error-handling logic for failed jobs.