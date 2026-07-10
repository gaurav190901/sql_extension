-- Problem : user-activity-for-the-past-30-days-i
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-07-10T09:24:56.849Z
--

select activity_date as day,count(distinct(user_id))as active_users
from activity
where activity_date>'2019-06-27' and activity_date<='2019-07-27'
group by activity_date;
