-- Problem : students-and-examinations
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:12:51.125Z
--

select 
    st.student_id,
    st.student_name,
    su.subject_name, 
    count(e.student_id)as attended_exams
from students st 
cross join subjects su
left join examinations e on st.student_id=e.student_id and su.subject_name=e.subject_name

group by st.student_id,st.student_name,su.subject_name
order by st.student_id,st.student_name,su.subject_name;