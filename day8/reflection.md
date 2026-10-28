# Reflection

## The most difficult concept and how I overcame it

The hardest concept for me was database design, especially explaining why a design is right instead of only listing the tables. My first written justification was too general, and the reviewer pointed out that part of it described a different kind of system. I overcame this by rewriting it around the real rules in my own school database: a unique email, a grade between 0 and 100, and a composite key that stops a student being enrolled twice. Tying each idea, such as ACID, to a concrete example made it click. In TicketHub I used the same thinking: an atomic conditional UPDATE holds a seat, and a UNIQUE constraint on tickets.seat_id stops double-booking.

## What I would improve in my capstone

Based on the feedback on my QuickNotes project, I would improve my data model document. I left some explanations unfinished, including the reasoning for the join table, the index trade-off and the choice of SQL. The reviewer also asked me to show the status code and new ID after creating a note, and to explain how deleting works against a practice API. Next time I will finish every explanation before submitting, search my files for leftover instructions, and check the project brief line by line.

## What I will learn next

Next I want to build a full QuickNotes app with a real backend and database, so notes are saved on a server. I also want to test my seat-hold query with two simultaneous requests to see "first one wins" for myself. After that I will learn React to build larger interfaces from reusable components.