-- Problem : replace-employee-id-with-the-unique-identifier
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:15:50.792Z
--

select u.unique_id,e.name from Employees e left join EmployeeUNI u on u.id=e.id;