-- Problem : rising-temperature
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-14T08:43:46.692Z
--

select id from (

select t.id,t.recorddate,t.temperature,lag(y.recorddate)over(order by y.recorddate)as yesterday,lag(y.temperature) over(order by y.recorddate)as temp_yesterday from weather t left join weather y on t.id=y.id

)as gg

where datediff(recorddate,yesterday)=1 and temperature>temp_yesterday;