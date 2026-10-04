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

## Database Justification

For this school system, I chose a Relational Database Management System (RDBMS) using SQLite because school records require strict data rules, structured links between tables, and safety guarantees during data entry.

### Enforcing Consistency with Design Rules

My design enforces specific rules directly in `school.sql`:

- A composite primary key `(student_id, course_id)` in `enrolments` prevents a student from being enrolled in the exact same course twice.
- A `CHECK` constraint on `grade` ensures marks stay between 0 and 100, inclusive.
- A `UNIQUE` constraint on student emails prevents two students from sharing an account.
- Foreign key constraints in `enrolments` ensure an enrolment record cannot point to a student or course that does not exist.

In a school, breaking these rules would mean enrolling non-existent students, assigning invalid grades, creating duplicate enrolment records, or two students sharing one email address.

### Relationships Across Entities

The data is naturally linked: the `students` table connects to the `courses` table in a many-to-many relationship through the `enrolments` junction table. SQL handles this with JOIN clauses, which I used in my queries to pull together a student's full course list and final grades into a single output.

### Data Integrity with ACID Properties

ACID properties matter here because they stop data from getting corrupted during errors or simultaneous updates:

- **Atomicity:** If grades are saved together in one transaction and a system crash happens halfway through, the database rolls back completely so partial data is not saved.
- **Isolation:** If two teachers update a student's grade at the exact same moment, the database processes the updates safely one after the other so the operations do not corrupt each other.
- **Durability:** Once a grade update is committed, it stays saved even if the server immediately loses power.

### Why Not NoSQL?

NoSQL would suit unstructured or rapidly changing data like social media feeds, but a school's records are tightly structured and interdependent, making a relational SQLite database the proper choice.