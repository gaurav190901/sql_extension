-- Problem : number-of-unique-subjects-taught-by-each-teacher
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-13T15:53:03.112Z
--

# Write your MySQL query statement below
select teacher_id, count(distinct(subject_id)) as cnt from teacher group by teacher_id;