-- Problem : employees-whose-manager-left-the-company
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-12T03:42:05.329Z
--

select employee_id from employees where salary<30000 and manager_id not in(select employee_id from employees) order by employee_id;