-- Problem : employee-bonus
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:18:37.900Z
--

# Write your MySQL query statement below
select e.name,b.bonus from employee e left join bonus b on e.empId=b.empId where b.bonus<1000 or b.bonus is null;