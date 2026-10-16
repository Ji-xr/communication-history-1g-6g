# 澜对白布局审计表

审计日期：2026-10-15。审计来源为当前项目的七个对白数据脚本、事件触发数据、澜系统分类器、应用路由调用与澜样式。静态数据共 **128** 条。

## 统一显示规则

- story、中央剧情语义位置（场景、任务、实验室、体验、归档、总结、过渡）与体验/归档故事线统一进入中央模式。
- 普通展品补充、时代选择与一般提醒维持右下陪伴卡片。
- 中央对白由 CommsArchiveLan 的单一根节点管理；调用方不得直接搬动卡片或覆写显示模式。
- 中央对白框固定于视口中心，层级为 90，高于暗幕 89；历史阅读层为 91。章节澜槽只对陪伴模式应用静态定位。

## 静态数据逐条审计

字段“来源/场景”为实际数据模块与位置；“触发链”优先列出事件规则，事件最终统一进入 dispatchEvent → trigger → show；没有事件规则时，列出数据触发名，运行入口仍由 CommsArchiveLan.trigger(id) 或场景回调进入。

|时代|场景 / ID|来源|触发链|数据类型|预期位置|分类器实际位置|审计结果|
|---|---|---|---|---|---|---|---|
|1G|entrance / `lan_1g_enter_001`|`lan-dialogue-1g.js`|ENTER_ERA(era=1G,firstEnter=true)|story / main|中央剧情|中央剧情|未发现分类冲突|
|1G|scene / `lan_1g_observe_001`|`lan-dialogue-1g.js`|SCENE_OBSERVED(era=1G)|optional / main|中央剧情|中央剧情|修复：场景叙事统一按剧情对白居中|
|1G|exhibit / `lan_1g_exhibit_001`|`lan-dialogue-1g.js`|EXHIBIT_CLICK(era=1G,exhibitId=exhibit.1g.handset)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|1G|exhibit-detail / `lan_1g_antenna_001`|`lan-dialogue-1g.js`|EXHIBIT_DETAIL(era=1G,detail=antenna)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|1G|exhibit-detail / `lan_1g_battery_001`|`lan-dialogue-1g.js`|EXHIBIT_DETAIL(era=1G,detail=battery)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|1G|laboratory / `lan_1g_lab_001`|`lan-dialogue-1g.js`|TECH_START(era=1G)|optional / main|中央剧情|中央剧情|修复：实验室位置统一按剧情对白居中|
|1G|laboratory / `lan_1g_tech_problem_001`|`lan-dialogue-1g.js`|TECH_PROBLEM(era=1G)|optional / main|中央剧情|中央剧情|修复：实验室位置统一按剧情对白居中|
|1G|task / `lan_1g_task_start_001`|`lan-dialogue-1g.js`|TASK_START(era=1G)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|1G|task / `lan_1g_base_station_001`|`lan-dialogue-1g.js`|EXHIBIT_CLICK(era=1G,exhibitId=exhibit.1g.network) / TASK_CLUE(era=1G,clue=base-station)|optional / main|中央剧情|中央剧情|由位置/故事线分类补足中央模式|
|1G|task / `lan_1g_signal_area_001`|`lan-dialogue-1g.js`|TASK_CLUE(era=1G,clue=signal-area)|optional / main|中央剧情|中央剧情|由位置/故事线分类补足中央模式|
|1G|task / `lan_1g_issue_001`|`lan-dialogue-1g.js`|TASK_REVEAL(era=1G)|optional / main|中央剧情|中央剧情|由位置/故事线分类补足中央模式|
|1G|task-result / `lan_1g_task_complete_001`|`lan-dialogue-1g.js`|TASK_COMPLETE(era=1G)|optional / main|中央剧情|中央剧情|由位置/故事线分类补足中央模式|
|1G|summary / `lan_1g_summary_001`|`lan-dialogue-1g.js`|ERA_ARCHIVE(era=1G)|optional / main|中央剧情|中央剧情|由位置/故事线分类补足中央模式|
|1G|transition / `lan_1g_unlock_2g_001`|`lan-dialogue-1g.js`|ERA_UNLOCK(era=1G,nextEra=2G)|optional / main|中央剧情|中央剧情|由位置/故事线分类补足中央模式|
|1G|experience / `lan_1g_experience_call_001`|`lan-dialogue-1g.js`|EXPERIENCE_NODE(era=1G,nodeId=EXPERIENCE_1G_CALL)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|1G|experience / `lan_1g_experience_coverage_001`|`lan-dialogue-1g.js`|EXPERIENCE_NODE(era=1G,nodeId=EXPERIENCE_1G_COVERAGE)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|1G|experience / `lan_1g_experience_reconnect_001`|`lan-dialogue-1g.js`|EXPERIENCE_NODE(era=1G,nodeId=EXPERIENCE_1G_RECONNECT)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|2G|entrance / `lan_2g_enter_001`|`lan-dialogue-2g.js`|ENTER_ERA(era=2G,firstEnter=true)|story / main|中央剧情|中央剧情|未发现分类冲突|
|2G|scene / `lan_2g_observe_001`|`lan-dialogue-2g.js`|SCENE_OBSERVED(era=2G)|optional / main|中央剧情|中央剧情|修复：场景叙事统一按剧情对白居中|
|2G|exhibit / `lan_2g_phone_001`|`lan-dialogue-2g.js`|EXHIBIT_CLICK(era=2G,exhibitId=exhibit.2g.handset)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|2G|exhibit / `lan_2g_sim_001`|`lan-dialogue-2g.js`|EXHIBIT_CLICK(era=2G,exhibitId=exhibit.2g.sim)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|2G|exhibit / `lan_2g_sms_001`|`lan-dialogue-2g.js`|EXHIBIT_CLICK(era=2G,exhibitId=exhibit.2g.sms)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|2G|laboratory / `lan_2g_lab_001`|`lan-dialogue-2g.js`|TECH_START(era=2G)|hint / main|中央剧情|中央剧情|修复：实验室位置统一按剧情对白居中|
|2G|task / `lan_2g_task_start_001`|`lan-dialogue-2g.js`|TASK_START(era=2G)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|2G|task / `lan_2g_send_sms_001`|`lan-dialogue-2g.js`|TASK_CLUE(era=2G,clue=send-sms)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|2G|task / `lan_2g_check_terminal_001`|`lan-dialogue-2g.js`|TASK_CLUE(era=2G,clue=terminal)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|2G|task / `lan_2g_check_network_001`|`lan-dialogue-2g.js`|TASK_CLUE(era=2G,clue=network)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|2G|task / `lan_2g_check_smsc_001`|`lan-dialogue-2g.js`|TASK_CLUE(era=2G,clue=smsc)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|2G|task / `lan_2g_check_number_001`|`lan-dialogue-2g.js`|TASK_CLUE(era=2G,clue=number-config)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|2G|task-result / `lan_2g_reveal_001`|`lan-dialogue-2g.js`|TASK_REVEAL(era=2G)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|2G|task-result / `lan_2g_task_complete_001`|`lan-dialogue-2g.js`|TASK_COMPLETE(era=2G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|2G|summary / `lan_2g_summary_001`|`lan-dialogue-2g.js`|ERA_ARCHIVE(era=2G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|2G|transition / `lan_2g_unlock_3g_001`|`lan-dialogue-2g.js`|ERA_UNLOCK(era=2G,nextEra=3G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|2G|experience / `lan_2g_experience_compose_001`|`lan-dialogue-2g.js`|EXPERIENCE_NODE(era=2G,nodeId=EXPERIENCE_2G_COMPOSE)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|2G|experience / `lan_2g_experience_relay_001`|`lan-dialogue-2g.js`|EXPERIENCE_NODE(era=2G,nodeId=EXPERIENCE_2G_RELAY)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|2G|experience / `lan_2g_experience_delivery_001`|`lan-dialogue-2g.js`|EXPERIENCE_NODE(era=2G,nodeId=EXPERIENCE_2G_DELIVERY)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|3G|entrance / `lan_3g_enter_001`|`lan-dialogue-3g.js`|ENTER_ERA(era=3G,firstEnter=true)|story / main|中央剧情|中央剧情|未发现分类冲突|
|3G|scene / `lan_3g_observe_001`|`lan-dialogue-3g.js`|SCENE_OBSERVED(era=3G)|optional / main|中央剧情|中央剧情|修复：场景叙事统一按剧情对白居中|
|3G|exhibit / `lan_3g_phone_001`|`lan-dialogue-3g.js`|EXHIBIT_CLICK(era=3G,exhibitId=exhibit.3g.handset)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|3G|exhibit / `lan_3g_web_001`|`lan-dialogue-3g.js`|EXHIBIT_CLICK(era=3G,exhibitId=exhibit.3g.web)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|3G|exhibit / `lan_3g_nodeb_001`|`lan-dialogue-3g.js`|EXHIBIT_CLICK(era=3G,exhibitId=exhibit.3g.nodeb)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|3G|exhibit / `lan_3g_video_001`|`lan-dialogue-3g.js`|EXHIBIT_CLICK(era=3G,exhibitId=exhibit.3g.video)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|3G|laboratory / `lan_3g_lab_001`|`lan-dialogue-3g.js`|TECH_START(era=3G)|hint / main|中央剧情|中央剧情|修复：实验室位置统一按剧情对白居中|
|3G|task / `lan_3g_task_start_001`|`lan-dialogue-3g.js`|TASK_START(era=3G)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|3G|task / `lan_3g_clue_network_001`|`lan-dialogue-3g.js`|TASK_CLUE(era=3G,clue=network)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|3G|task / `lan_3g_clue_terminal_001`|`lan-dialogue-3g.js`|TASK_CLUE(era=3G,clue=terminal)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|3G|task / `lan_3g_clue_server_001`|`lan-dialogue-3g.js`|TASK_CLUE(era=3G,clue=server)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|3G|task / `lan_3g_clue_speed_001`|`lan-dialogue-3g.js`|TASK_CLUE(era=3G,clue=speed)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|3G|task-result / `lan_3g_reveal_001`|`lan-dialogue-3g.js`|TASK_REVEAL(era=3G)|hint / main|中央剧情|中央剧情|未发现分类冲突|
|3G|task-result / `lan_3g_task_complete_001`|`lan-dialogue-3g.js`|TASK_COMPLETE(era=3G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|3G|summary / `lan_3g_summary_001`|`lan-dialogue-3g.js`|ERA_ARCHIVE(era=3G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|3G|transition / `lan_3g_unlock_4g_001`|`lan-dialogue-3g.js`|ERA_UNLOCK(era=3G,nextEra=4G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|3G|experience / `lan_3g_experience_enter_001`|`lan-dialogue-3g.js`|EXPERIENCE_NODE(era=3G,nodeId=ENTER_EXPERIENCE_3G)|optional / main|中央剧情|中央剧情|未发现分类冲突|
|3G|experience / `lan_3g_experience_internet_001`|`lan-dialogue-3g.js`|EXPERIENCE_NODE(era=3G,nodeId=CLICK_FIRST_MOBILE_INTERNET)|optional / main|中央剧情|中央剧情|未发现分类冲突|
|3G|experience / `lan_3g_experience_map_001`|`lan-dialogue-3g.js`|EXPERIENCE_NODE(era=3G,nodeId=USE_MOBILE_MAP)|optional / main|中央剧情|中央剧情|未发现分类冲突|
|3G|experience / `lan_3g_experience_content_001`|`lan-dialogue-3g.js`|EXPERIENCE_NODE(era=3G,nodeId=BROWSE_MOBILE_CONTENT)|optional / main|中央剧情|中央剧情|未发现分类冲突|
|3G|experience / `lan_3g_experience_video_001`|`lan-dialogue-3g.js`|EXPERIENCE_NODE(era=3G,nodeId=WATCH_EARLY_VIDEO)|optional / main|中央剧情|中央剧情|未发现分类冲突|
|3G|experience-summary / `lan_3g_merge_001`|`lan-dialogue-3g.js`|EXPERIENCE_MERGE(era=3G)|optional / main|中央剧情|中央剧情|未发现分类冲突|
|3G|archive / `lan_3g_archive_entry_001`|`lan-dialogue-3g-archive.js`|ENTER_ARCHIVE_3G(era=3G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|3G|archive / `lan_3g_archive_technology_001`|`lan-dialogue-3g-archive.js`|VIEW_ARCHIVE_SECTION(era=3G,section=technology)|optional / main|中央剧情|中央剧情|未发现分类冲突|
|3G|archive / `lan_3g_archive_experience_001`|`lan-dialogue-3g-archive.js`|VIEW_ARCHIVE_SECTION(era=3G,section=experience)|optional / main|中央剧情|中央剧情|未发现分类冲突|
|3G|archive / `lan_3g_archive_complete_001`|`lan-dialogue-3g-archive.js`|ARCHIVE_3G_COMPLETE(era=3G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|3G|transition / `lan_3g_archive_unlock_4g_001`|`lan-dialogue-3g-archive.js`|UNLOCK_4G(era=3G,nextEra=4G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|4G|entrance / `lan_4g_enter_001`|`lan-dialogue-4g.js`|ENTER_ERA(era=4G,firstEnter=true)|story / main|中央剧情|中央剧情|未发现分类冲突|
|4G|exhibit / `lan_4g_phone_001`|`lan-dialogue-4g.js`|EXHIBIT_CLICK(era=4G,exhibitId=exhibit.4g.handset)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|4G|exhibit / `lan_4g_video_001`|`lan-dialogue-4g.js`|EXHIBIT_CLICK(era=4G,exhibitId=exhibit.4g.video)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|4G|exhibit / `lan_4g_live_001`|`lan-dialogue-4g.js`|EXHIBIT_CLICK(era=4G,exhibitId=exhibit.4g.live)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|4G|exhibit / `lan_4g_base_001`|`lan-dialogue-4g.js`|EXHIBIT_CLICK(era=4G,exhibitId=exhibit.4g.lte)|optional / builder|右下陪伴|右下陪伴|未发现分类冲突|
|4G|laboratory / `lan_4g_tech_001`|`lan-dialogue-4g.js`|TECH_START(era=4G)|hint / builder|中央剧情|中央剧情|修复：实验室位置统一按剧情对白居中|
|4G|task / `lan_4g_task_start_001`|`lan-dialogue-4g.js`|TASK_START(era=4G)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|4G|task / `lan_4g_clue_capacity_001`|`lan-dialogue-4g.js`|TASK_CLUE(era=4G,clue=network-capacity)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|4G|task / `lan_4g_clue_load_001`|`lan-dialogue-4g.js`|TASK_CLUE(era=4G,clue=base-load)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|4G|task / `lan_4g_clue_route_001`|`lan-dialogue-4g.js`|TASK_CLUE(era=4G,clue=data-route)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|4G|task / `lan_4g_clue_service_001`|`lan-dialogue-4g.js`|TASK_CLUE(era=4G,clue=video-service)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|4G|task-result / `lan_4g_reveal_001`|`lan-dialogue-4g.js`|TASK_REVEAL(era=4G)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|4G|task-result / `lan_4g_task_complete_001`|`lan-dialogue-4g.js`|TASK_COMPLETE(era=4G)|story / builder|中央剧情|中央剧情|未发现分类冲突|
|4G|experience / `lan_4g_experience_start_001`|`lan-dialogue-4g.js`|EXPERIENCE_START(era=4G)|story / experience|中央剧情|中央剧情|未发现分类冲突|
|4G|experience / `lan_4g_experience_video_001`|`lan-dialogue-4g.js`|EXPERIENCE_NODE(era=4G,nodeId=EXPERIENCE_4G_VIDEO)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|4G|experience / `lan_4g_experience_share_001`|`lan-dialogue-4g.js`|EXPERIENCE_NODE(era=4G,nodeId=EXPERIENCE_4G_SHARE)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|4G|experience / `lan_4g_experience_live_001`|`lan-dialogue-4g.js`|EXPERIENCE_NODE(era=4G,nodeId=EXPERIENCE_4G_LIVE)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|4G|experience / `lan_4g_experience_social_001`|`lan-dialogue-4g.js`|EXPERIENCE_NODE(era=4G,nodeId=EXPERIENCE_4G_SOCIAL)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|4G|experience-summary / `lan_4g_experience_complete_001`|`lan-dialogue-4g.js`|EXPERIENCE_MERGE(era=4G)|story / experience|中央剧情|中央剧情|未发现分类冲突|
|4G|archive / `lan_4g_archive_entry_001`|`lan-dialogue-4g.js`|ENTER_ARCHIVE_4G(era=4G)|story / archive|中央剧情|中央剧情|未发现分类冲突|
|4G|archive / `lan_4g_archive_technology_001`|`lan-dialogue-4g.js`|VIEW_ARCHIVE_SECTION_4G(era=4G,section=technology)|optional / archive|中央剧情|中央剧情|未发现分类冲突|
|4G|archive / `lan_4g_archive_experience_001`|`lan-dialogue-4g.js`|VIEW_ARCHIVE_SECTION_4G(era=4G,section=experience)|optional / archive|中央剧情|中央剧情|未发现分类冲突|
|4G|archive / `lan_4g_archive_complete_001`|`lan-dialogue-4g.js`|ARCHIVE_4G_COMPLETE(era=4G)|story / archive|中央剧情|中央剧情|未发现分类冲突|
|4G|transition / `lan_4g_unlock_5g_001`|`lan-dialogue-4g.js`|UNLOCK_5G(era=4G,nextEra=5G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|5G|entrance / `lan_5g_enter_001`|`lan-dialogue-5g.js`|ENTER_ERA(era=5G,firstEnter=true)|story / main|中央剧情|中央剧情|未发现分类冲突|
|5G|exhibit / `lan_5g_city_001`|`lan-dialogue-5g.js`|EXHIBIT_CLICK(era=5G,exhibitId=exhibit.5g.city)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|5G|exhibit / `lan_5g_car_001`|`lan-dialogue-5g.js`|EXHIBIT_CLICK(era=5G,exhibitId=exhibit.5g.car)|optional / main|右下陪伴|右下陪伴|未发现分类冲突|
|5G|exhibit / `lan_5g_robot_001`|`lan-dialogue-5g.js`|EXHIBIT_CLICK(era=5G,exhibitId=exhibit.5g.robot)|optional / builder|右下陪伴|右下陪伴|未发现分类冲突|
|5G|exhibit / `lan_5g_sensor_001`|`lan-dialogue-5g.js`|EXHIBIT_CLICK(era=5G,exhibitId=exhibit.5g.sensor)|optional / builder|右下陪伴|右下陪伴|未发现分类冲突|
|5G|laboratory / `lan_5g_tech_001`|`lan-dialogue-5g.js`|TECH_START(era=5G)|hint / builder|中央剧情|中央剧情|修复：实验室位置统一按剧情对白居中|
|5G|task / `lan_5g_task_start_001`|`lan-dialogue-5g.js`|TASK_START(era=5G)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|5G|task / `lan_5g_clue_device_001`|`lan-dialogue-5g.js`|TASK_CLUE(era=5G,clue=device-connection)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|5G|task / `lan_5g_clue_latency_001`|`lan-dialogue-5g.js`|TASK_CLUE(era=5G,clue=latency)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|5G|task / `lan_5g_clue_edge_001`|`lan-dialogue-5g.js`|TASK_CLUE(era=5G,clue=edge-node)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|5G|task / `lan_5g_clue_sync_001`|`lan-dialogue-5g.js`|TASK_CLUE(era=5G,clue=data-sync)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|5G|task-result / `lan_5g_reveal_001`|`lan-dialogue-5g.js`|TASK_REVEAL(era=5G)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|5G|task-result / `lan_5g_task_complete_001`|`lan-dialogue-5g.js`|TASK_COMPLETE(era=5G)|story / builder|中央剧情|中央剧情|未发现分类冲突|
|5G|experience / `lan_5g_experience_start_001`|`lan-dialogue-5g.js`|EXPERIENCE_START(era=5G)|story / experience|中央剧情|中央剧情|未发现分类冲突|
|5G|experience / `lan_5g_experience_traffic_001`|`lan-dialogue-5g.js`|EXPERIENCE_NODE(era=5G,nodeId=EXPERIENCE_5G_TRAFFIC)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|5G|experience / `lan_5g_experience_home_001`|`lan-dialogue-5g.js`|EXPERIENCE_NODE(era=5G,nodeId=EXPERIENCE_5G_HOME)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|5G|experience / `lan_5g_experience_medical_001`|`lan-dialogue-5g.js`|EXPERIENCE_NODE(era=5G,nodeId=EXPERIENCE_5G_MEDICAL)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|5G|experience / `lan_5g_experience_industry_001`|`lan-dialogue-5g.js`|EXPERIENCE_NODE(era=5G,nodeId=EXPERIENCE_5G_INDUSTRY)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|5G|experience-summary / `lan_5g_experience_complete_001`|`lan-dialogue-5g.js`|EXPERIENCE_MERGE(era=5G)|story / experience|中央剧情|中央剧情|未发现分类冲突|
|5G|archive / `lan_5g_archive_entry_001`|`lan-dialogue-5g.js`|ENTER_ARCHIVE_5G(era=5G)|story / archive|中央剧情|中央剧情|未发现分类冲突|
|5G|archive / `lan_5g_archive_technology_001`|`lan-dialogue-5g.js`|VIEW_ARCHIVE_SECTION_5G(era=5G,section=technology)|optional / archive|中央剧情|中央剧情|未发现分类冲突|
|5G|archive / `lan_5g_archive_experience_001`|`lan-dialogue-5g.js`|VIEW_ARCHIVE_SECTION_5G(era=5G,section=experience)|optional / archive|中央剧情|中央剧情|未发现分类冲突|
|5G|archive / `lan_5g_archive_complete_001`|`lan-dialogue-5g.js`|ARCHIVE_5G_COMPLETE(era=5G)|story / archive|中央剧情|中央剧情|未发现分类冲突|
|5G|transition / `lan_5g_unlock_6g_001`|`lan-dialogue-5g.js`|UNLOCK_6G(era=5G,nextEra=6G)|story / main|中央剧情|中央剧情|未发现分类冲突|
|6G|entrance / `lan_6g_enter_001`|`lan-dialogue-6g.js`|ENTER_ERA(era=6G,firstEnter=true)|story / main|中央剧情|中央剧情|未发现分类冲突|
|6G|task / `lan_6g_task_start_001`|`lan-dialogue-6g.js`|TASK_START(era=6G)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|6G|laboratory / `lan_6g_tech_001`|`lan-dialogue-6g.js`|TECH_START(era=6G)|hint / builder|中央剧情|中央剧情|修复：实验室位置统一按剧情对白居中|
|6G|task-result / `lan_6g_reveal_001`|`lan-dialogue-6g.js`|TASK_REVEAL(era=6G)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|6G|task / `lan_6g_check_communication_001`|`lan-dialogue-6g.js`|TASK_CLUE(era=6G,clue=communication)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|6G|task / `lan_6g_check_sensing_001`|`lan-dialogue-6g.js`|TASK_CLUE(era=6G,clue=sensing)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|6G|task / `lan_6g_check_ai_001`|`lan-dialogue-6g.js`|TASK_CLUE(era=6G,clue=ai-model)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|6G|task / `lan_6g_check_twin_001`|`lan-dialogue-6g.js`|TASK_CLUE(era=6G,clue=digital-twin)|hint / builder|中央剧情|中央剧情|未发现分类冲突|
|6G|task-result / `lan_6g_task_complete_001`|`lan-dialogue-6g.js`|TASK_COMPLETE(era=6G)|story / builder|中央剧情|中央剧情|未发现分类冲突|
|6G|experience / `lan_6g_experience_start_001`|`lan-dialogue-6g.js`|EXPERIENCE_START(era=6G)|story / experience|中央剧情|中央剧情|未发现分类冲突|
|6G|experience / `lan_6g_experience_city_001`|`lan-dialogue-6g.js`|EXPERIENCE_NODE(era=6G,nodeId=EXPERIENCE_6G_CITY)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|6G|experience / `lan_6g_experience_environment_001`|`lan-dialogue-6g.js`|EXPERIENCE_NODE(era=6G,nodeId=EXPERIENCE_6G_ENVIRONMENT)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|6G|experience / `lan_6g_experience_ai_001`|`lan-dialogue-6g.js`|EXPERIENCE_NODE(era=6G,nodeId=EXPERIENCE_6G_AI)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|6G|experience / `lan_6g_experience_merge_001`|`lan-dialogue-6g.js`|EXPERIENCE_NODE(era=6G,nodeId=EXPERIENCE_6G_MERGE)|optional / experience|中央剧情|中央剧情|未发现分类冲突|
|6G|experience-summary / `lan_6g_experience_complete_001`|`lan-dialogue-6g.js`|EXPERIENCE_MERGE(era=6G)|story / experience|中央剧情|中央剧情|未发现分类冲突|
|6G|archive / `lan_6g_archive_entry_001`|`lan-dialogue-6g.js`|ENTER_ARCHIVE_6G(era=6G)|story / archive|中央剧情|中央剧情|未发现分类冲突|
|6G|archive / `lan_6g_archive_complete_001`|`lan-dialogue-6g.js`|ARCHIVE_6G_COMPLETE(era=6G)|story / archive|中央剧情|中央剧情|未发现分类冲突|

## 序章、跨时代及运行时对白

|场景|对白ID|来源|触发入口|预期位置|实际位置|审计结果|
|---|---|---|---|---|---|---|
|首页|`lan.home.first-visit`|`assets/js/lan-system.js`|onRoute(home) → trigger → show|中央剧情|中央剧情|首次档案介绍需作为剧情段播放|
|序章|`lan.prologue.first-travel`|`assets/js/lan-system.js`|openPrologue → trigger → show|中央剧情|中央剧情|统一剧情入口|
|时代选择|`lan.gallery.select-era`|`assets/js/lan-system.js`|onGallerySelect → freshCustom → show|右下陪伴|右下陪伴|普通选择提示|
|展品详情|`lan.exhibit.open`|`assets/js/lan-system.js`|onExhibit → freshCustom → show|右下陪伴|右下陪伴|展品补充保持轻量卡片|
|调查开始|`lan.task.start`|`assets/js/lan-system.js`|onTaskStart → freshCustom/dispatchEvent → show|中央剧情|中央剧情|关键任务引导|
|调查完成|`lan.task.complete`|`assets/js/lan-system.js`|onTaskComplete → freshCustom/dispatchEvent → show|中央剧情|中央剧情|关键结果反馈|
|档案馆|`lan.archive.open`|`assets/js/lan-system.js`|onRoute(archive) → trigger → show|右下陪伴|右下陪伴|普通档案提示|
|1G返回时代|`lan.1g.return-entry`|`assets/js/lan-system.js`|onRoute(chapter,1G) → freshCustom → show|中央剧情|中央剧情|恢复时代上下文|
|2G返回时代|`lan.2g.return-entry`|`assets/js/lan-system.js`|onRoute(chapter,2G) → freshCustom → show|中央剧情|中央剧情|恢复时代上下文|
|3G返回时代|`lan.3g.return-entry`|`assets/js/lan-system.js`|onRoute(chapter,3G) → freshCustom → show|中央剧情|中央剧情|恢复时代上下文|
|4G返回时代|`lan.4g.return-entry`|`assets/js/lan-system.js`|onRoute(chapter,4G) → freshCustom → show|中央剧情|中央剧情|恢复时代上下文|
|5G返回时代|`lan.5g.return-entry`|`assets/js/lan-system.js`|onRoute(chapter,5G) → freshCustom → show|中央剧情|中央剧情|恢复时代上下文|
|6G返回时代|`lan.6g.return-entry`|`assets/js/lan-system.js`|onRoute(chapter,6G) → freshCustom → show|中央剧情|中央剧情|恢复时代上下文|
|6G最终收束|`lan.6g.identity-reveal`|`assets/js/lan-system.js`|onRoute(ending)/onTaskComplete → trigger → show|中央剧情|中央剧情|保留旧ID，仅维持既有结局对白与存档兼容|

## 统一调用与DOM所有权

|环节|唯一入口/调用|检查结果|
|---|---|---|
|数据装载|index.html先加载时代对白脚本，再加载lan-system.js|六代对白与3G归档数据在澜系统初始化前注册|
|应用事件|app.js的dispatchLanEvent；章节render后调用CommsArchiveLan.onRoute|页面路由更新不直接改澜卡片位置|
|对话事件|CommsArchiveLan.dispatchEvent / trigger / show|最终通过priorityDialogue决定整段队列的显示模式|
|DOM根节点|lan-system.js的makeRoot、setDisplayMode、updateWidget|全站仅澜系统创建并管理#lanCompanion；创建时清理重复ID节点|
|页面切换|lan-system.js的onRoute|保留当前对话模式；剧情期间重新挂到document.body|
|对白推进|lan-system.js的next、continueDialogueAfter、returnToCompanion、skip|连续句维持队列模式；结束与跳过走统一收尾|
|样式|assets/css/lan.css；assets/css/progression.css只样式化非剧情陪伴卡|中央层级高于背景暗幕；固定定位不受章节卡片父级布局裁剪|

## 根因与修复

1. 多条实验室对白使用 laboratory 位置，部分缺少显式 dialogueType；旧分类漏掉实验室位置，导致关键对白回落为陪伴卡。现在实验室和调查场景等语义位置统一中央分类；调用方传入 companion 也不能覆盖剧情分类。
2. 历史现场对白没有显式 story 类型，原位置分类遗漏 scene，现把 scene 纳入中央模式；没有改写六代对白数据，只依据明确的场景上下文分类。
3. 首次首页介绍与通过 freshCustom 生成的任务引导没有数据模块显式类型；现在首页首次介绍按触发语义居中，任务位置统一中央。
4. 澜卡片可保存自定义拖动坐标。中央模式现在清除内联角落坐标并挂到 document.body；离开中央模式时恢复用户保存位置，避免旧坐标拖回角落。
5. 原样式通过 `.lan-dialogue-center` 类提供z-index 90；它与 `data-mode` 需要同步。现在 `#lanCompanion[data-mode="dialogue"]` 也明确声明居中位置、z-index 90和点击接收，暗幕维持89，历史层91。这样即使class状态短暂不同步，中央对白仍由实际mode维持布局；这是状态一致性保护，不把原有z-index规则误报为已复现的根因，也没有用 `!important`。
6. 对白显示状态以当前活动队列为准，重绘时请求切换到陪伴模式会被活动剧情队列纠正；句间更新保持原模式。重复的 advanceFromUser 函数声明已去重。

## 测试边界

新增测试会执行真实的分类器、对白队列推进与模式切换函数，并检查CSS规则、六代数据行和章节重绘入口。当前环境尚未完成真实浏览器边界框和截图验收；CSS与DOM状态的自动化测试不等同于浏览器计算样式验证。
