-- Problem : project-employees-i
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-16T08:28:53.150Z
--

# Write your MySQL query statement below
select p.project_id,round(avg(e.experience_years),2)as average_years from project p left join employee e on p.employee_id=e.employee_id group by p.project_id;