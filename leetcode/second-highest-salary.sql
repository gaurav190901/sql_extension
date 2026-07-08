-- Problem : second-highest-salary
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-07-08T14:59:16.180Z
--

# Write your MySQL query statement below
select max(salary) as SecondHighestSalary from employee where salary <(select max(salary) from employee);