# School Database Design

## Tables

### students
- Stores one row per student: `id` (primary key), `name`, and a unique `email`.

### courses
- Stores one row per course: `id` (primary key), a unique `code` and a `title`.

### enrolments
- Stores the fact that a student is on a course, plus their `grade`.
- Its primary key is the pair (`student_id`, `course_id`), and both columns are foreign keys.

## Relationships

- **One-to-many:** one student has many enrolments, and one course has many enrolments. Each enrolment row belongs to exactly one student and one course.
- **Many-to-many:** students and courses. A student can take many courses, and a course has many students.
- **Why a join table is needed:** a single column can't hold many values, and storing a list like "WD101,DB201" in a column breaks the one-value-per-column rule and is hard to search. The `enrolments` table stores one row per student-course pair instead, and it's also where the grade belongs, because a grade belongs to the pair and not to the student or the course alone.

## Index

- `CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);`
- **Reason:** the primary key already helps when searching by student, but queries like "all students on one course" and "students per course" search by `course_id`. An index on that column lets the database jump straight to the right rows instead of scanning the whole table.
- **Trade-off:** it makes inserts slightly slower and uses a little extra storage.

## SQL or NoSQL?

I would choose NoSQL here because the readings arrive in huge volumes and different stations send different fields, so a fixed table would be awkward. Most readings are stored and read back on their own, so we rarely need joins. If we later needed strict rules or complex reports across linked tables, SQL could be worth reconsidering