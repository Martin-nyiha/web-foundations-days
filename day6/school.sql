-- School database: students, courses and enrolments
 
PRAGMA foreign_keys = ON;
 
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
 
CREATE TABLE students (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
 
CREATE TABLE courses (
  id    INTEGER PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL
);
 
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  grade      INTEGER CHECK (grade BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);
-- Index for lookups by course (the primary key already covers lookups by student)
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
 
INSERT INTO students (id, name, email) VALUES
  (1, 'Amina Hassan',    'amina@example.com'),
  (2, 'Brian Otieno',    'brian@example.com'),
  (3, 'Cynthia Wanjiru', 'cynthia@example.com'),
  (4, 'David Mwangi',    'david@example.com');
 
INSERT INTO courses (id, code, title) VALUES
  (1, 'WD101', 'Web Development'),
  (2, 'DB201', 'Databases'),
  (3, 'PY101', 'Python Basics');
 
INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 85),
  (1, 2, 78),
  (2, 1, 72),
  (2, 3, 90),
  (3, 2, 66),
  (3, 1, NULL);
 
-- 1. All courses for one student (by name)
SELECT courses.title, enrolments.grade
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses    ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Hassan';
 
-- 2. All students on one course
SELECT students.name, students.email
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students   ON students.id = enrolments.student_id
WHERE courses.title = 'Web Development';
 
-- 3. Number of students per course
SELECT courses.title, COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id, courses.title;
 
-- 4. Students who have no enrolments
SELECT students.name
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.student_id IS NULL;
 
-- 5. Update one enrolment's grade
UPDATE enrolments
SET grade = 95
WHERE student_id = 1 AND course_id = 2;
 
-- Check the update worked (grade should now be 95)
SELECT * FROM enrolments WHERE student_id = 1 AND course_id = 2;
 