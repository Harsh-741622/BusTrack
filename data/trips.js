(function () {
  window.BusTrackData = window.BusTrackData || {};

  // Daily operational trip runs. Empty service_date means the pilot schedule recurs daily.

  window.BusTrackData.trips = [
  {
    trip_id: "TRIP_001_GJ_18_Z_7932",
    bus_id: "BUS_GJ_18_Z_7932",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "05:40",
    scheduled_arrival: "06:20",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "05:40"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "05:45"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "06:00"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "06:20"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_002_GJ_18_Z_7932",
    bus_id: "BUS_GJ_18_Z_7932",
    route_id: "ROUTE_SELAMBA_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_SELAMBA_TO_DEDIAPADA",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "13:15",
    scheduled_arrival: "18:10",
    stop_times: [
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "13:15"
      },
      {
        stop_id: "STOP_DEDIAPADA",
        arrival_time: "14:05"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "14:48"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "16:05"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "16:35"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "17:05"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "17:12"
      },
      {
        stop_id: "STOP_MAHUVA_BARDOLI",
        arrival_time: "17:25"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "18:10"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_003_GJ_18_Z_7808",
    bus_id: "BUS_GJ_18_Z_7808",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "05:50",
    scheduled_arrival: "06:35",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "05:50"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "05:55"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "06:10"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "06:35"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_004_GJ_18_Z_7808",
    bus_id: "BUS_GJ_18_Z_7808",
    route_id: "ROUTE_NAVSARI_RAJPIPLA",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "07:00",
    scheduled_arrival: "11:00",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "07:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "07:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "07:50"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "08:15"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "08:40"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "10:00"
      },
      {
        stop_id: "STOP_RAJPIPLA",
        arrival_time: "11:00"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_005_GJ_18_Z_7808",
    bus_id: "BUS_GJ_18_Z_7808",
    route_id: "ROUTE_RAJPIPLA_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_RAJPIPLA_TO_NETRANG",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "12:10",
    scheduled_arrival: "16:10",
    stop_times: [
      {
        stop_id: "STOP_RAJPIPLA",
        arrival_time: "12:10"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "13:10"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "14:40"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "15:00"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "15:30"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "15:50"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "16:10"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_006_GJ_18_Z_4875",
    bus_id: "BUS_GJ_18_Z_4875",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "06:40",
    scheduled_arrival: "07:25",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "06:40"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "06:45"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "07:00"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "07:25"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_007_GJ_18_Z_4875",
    bus_id: "BUS_GJ_18_Z_4875",
    route_id: "ROUTE_NAVSARI_BARDOLI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "08:00",
    scheduled_arrival: "08:50",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "08:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "08:20"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "08:40"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "08:50"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_008_GJ_18_Z_4875",
    bus_id: "BUS_GJ_18_Z_4875",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "08:55",
    scheduled_arrival: "09:40",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "08:55"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "09:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "09:15"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "09:40"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_009_GJ_18_Z_4875",
    bus_id: "BUS_GJ_18_Z_4875",
    route_id: "ROUTE_NAVSARI_BARDOLI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "10:10",
    scheduled_arrival: "11:05",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "10:10"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "10:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "11:00"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "11:05"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_010_GJ_18_Z_9648",
    bus_id: "BUS_GJ_18_Z_9648",
    route_id: "ROUTE_MANDVI_SURAT_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_MANDVI_SURAT_TO_TARSADA",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "06:00",
    scheduled_arrival: "07:40",
    stop_times: [
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "06:00"
      },
      {
        stop_id: "STOP_TARSADA",
        arrival_time: "06:15"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "06:20"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "06:50"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "07:40"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_011_GJ_18_ZT_0883",
    bus_id: "BUS_GJ_18_ZT_0883",
    route_id: "ROUTE_VANKAL_MANDVI_VALSAD",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_VANKAL_MANDVI_TO_ZANKHVAV",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "05:32",
    scheduled_arrival: "08:53",
    stop_times: [
      {
        stop_id: "STOP_VANKAL_MANDVI",
        arrival_time: "05:32"
      },
      {
        stop_id: "STOP_ZANKHVAV",
        arrival_time: "05:51"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "06:20"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "06:35"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "06:58"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "07:09"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "07:36"
      },
      {
        stop_id: "STOP_KHAREL",
        arrival_time: "07:59"
      },
      {
        stop_id: "STOP_CHIKHALI",
        arrival_time: "08:18"
      },
      {
        stop_id: "STOP_DUNGRI_CROSS",
        arrival_time: "08:37"
      },
      {
        stop_id: "STOP_VALSAD",
        arrival_time: "08:53"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_012_GJ_18_Z_8531",
    bus_id: "BUS_GJ_18_Z_8531",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "07:15",
    scheduled_arrival: "07:55",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "07:15"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "07:20"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "07:35"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "07:55"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_013_GJ_18_Z_8317",
    bus_id: "BUS_GJ_18_Z_8317",
    route_id: "ROUTE_RAJPIPLA_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_RAJPIPLA_TO_NETRANG",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "05:17",
    scheduled_arrival: "09:55",
    stop_times: [
      {
        stop_id: "STOP_RAJPIPLA",
        arrival_time: "05:17"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "06:38"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "07:55"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "08:12"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "08:46"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "09:12"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "09:55"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_014_GJ_18_Z_8317",
    bus_id: "BUS_GJ_18_Z_8317",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "12:00",
    scheduled_arrival: "12:40",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "12:00"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "12:08"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "12:20"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "12:40"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_015_GJ_18_Z_8317",
    bus_id: "BUS_GJ_18_Z_8317",
    route_id: "ROUTE_NAVSARI_RAJPIPLA_2",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "13:20",
    scheduled_arrival: "17:20",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "13:20"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "13:50"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "14:10"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "14:15"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "14:35"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "15:00"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "16:20"
      },
      {
        stop_id: "STOP_RAJPIPLA",
        arrival_time: "17:20"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_016_GJ_18_Z_7986",
    bus_id: "BUS_GJ_18_Z_7986",
    route_id: "ROUTE_BUHARI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BUHARI_TO_VALOD",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "08:10",
    scheduled_arrival: "09:45",
    stop_times: [
      {
        stop_id: "STOP_BUHARI",
        arrival_time: "08:10"
      },
      {
        stop_id: "STOP_VALOD",
        arrival_time: "08:30"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "08:50"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "09:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "09:15"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "09:45"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_017_GJ_18_Z_7800",
    bus_id: "BUS_GJ_18_Z_7800",
    route_id: "ROUTE_MASAD_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_MASAD_TO_BARDOLI",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "09:10",
    scheduled_arrival: "10:20",
    stop_times: [
      {
        stop_id: "STOP_MASAD",
        arrival_time: "09:10"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "09:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "09:40"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "10:00"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "10:20"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_018_GJ_18_Z_7800",
    bus_id: "BUS_GJ_18_Z_7800",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "17:00",
    scheduled_arrival: "17:40",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "17:00"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "17:08"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "17:20"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "17:40"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_019_GJ_18_Z_7800",
    bus_id: "BUS_GJ_18_Z_7800",
    route_id: "ROUTE_NAVSARI_BARDOLI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "18:05",
    scheduled_arrival: "19:05",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "18:05"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "18:25"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "18:55"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "19:05"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_020_GJ_18_Z_9651",
    bus_id: "BUS_GJ_18_Z_9651",
    route_id: "ROUTE_GANGTHA_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_GANGTHA_TO_SELAMBA",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "06:10",
    scheduled_arrival: "12:00",
    stop_times: [
      {
        stop_id: "STOP_GANGTHA",
        arrival_time: "06:10"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "07:10"
      },
      {
        stop_id: "STOP_SAGBARA",
        arrival_time: "07:20"
      },
      {
        stop_id: "STOP_UMARPADA",
        arrival_time: "08:25"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "09:30"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "09:50"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "10:20"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "10:28"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "10:41"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "12:00"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_021_GJ_18_Z_9651",
    bus_id: "BUS_GJ_18_Z_9651",
    route_id: "ROUTE_NAVSARI_SELAMBA",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: "<",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "14:00",
    scheduled_arrival: "19:50",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "14:00"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "14:38"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "14:51"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "15:00"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "15:30"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "15:49"
      },
      {
        stop_id: "STOP_UMARPADA",
        arrival_time: "16:54"
      },
      {
        stop_id: "STOP_SAGBARA",
        arrival_time: "19:27"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "19:50"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_022_GJ_18_Z_8355",
    bus_id: "BUS_GJ_18_Z_8355",
    route_id: "ROUTE_BARDOLI_BILIMORA",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "09:10",
    scheduled_arrival: "10:20",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "09:10"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "09:30"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "09:40"
      },
      {
        stop_id: "STOP_GANDEVI",
        arrival_time: "10:00"
      },
      {
        stop_id: "STOP_BILIMORA",
        arrival_time: "10:20"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_023_GJ_18_Z_8355",
    bus_id: "BUS_GJ_18_Z_8355",
    route_id: "ROUTE_BARDOLI_BILIMORA",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "15:45",
    scheduled_arrival: "17:25",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "15:45"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "15:55"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "16:35"
      },
      {
        stop_id: "STOP_GANDEVI",
        arrival_time: "17:00"
      },
      {
        stop_id: "STOP_BILIMORA",
        arrival_time: "17:25"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_024_GJ_18_Z_9710",
    bus_id: "BUS_GJ_18_Z_9710",
    route_id: "ROUTE_AKKALKUVA_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_AKKALKUVA_TO_SELAMBA",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "05:31",
    scheduled_arrival: "13:00",
    stop_times: [
      {
        stop_id: "STOP_AKKALKUVA",
        arrival_time: "05:31"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "06:21"
      },
      {
        stop_id: "STOP_SAGBARA",
        arrival_time: "06:40"
      },
      {
        stop_id: "STOP_UMARPADA",
        arrival_time: "08:47"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "09:45"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "10:13"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "10:55"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "11:01"
      },
      {
        stop_id: "STOP_KADODARA",
        arrival_time: "12:05"
      },
      {
        stop_id: "STOP_SURAT",
        arrival_time: "12:21"
      },
      {
        stop_id: "STOP_UDHANA",
        arrival_time: "12:32"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "13:00"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_025_GJ_18_Z_9710",
    bus_id: "BUS_GJ_18_Z_9710",
    route_id: "ROUTE_NAVSARI_AKKALKUVA",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: "<",
    current_segment: "SEG_NAVSARI_TO_UDHANA",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "13:15",
    scheduled_arrival: "19:00",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "13:15"
      },
      {
        stop_id: "STOP_UDHANA",
        arrival_time: "13:55"
      },
      {
        stop_id: "STOP_SURAT",
        arrival_time: "14:15"
      },
      {
        stop_id: "STOP_KADODARA",
        arrival_time: "14:50"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "15:05"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "15:10"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "15:25"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "16:15"
      },
      {
        stop_id: "STOP_UMARPADA",
        arrival_time: "16:55"
      },
      {
        stop_id: "STOP_SAGBARA",
        arrival_time: "17:15"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "17:50"
      },
      {
        stop_id: "STOP_GANGTHA",
        arrival_time: "18:50"
      },
      {
        stop_id: "STOP_AKKALKUVA",
        arrival_time: "19:00"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_026_GJ_18_Z_9001",
    bus_id: "BUS_GJ_18_Z_9001",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "11:30",
    scheduled_arrival: "12:10",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "11:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "11:38"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "11:50"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "12:10"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_027_GJ_18_Z_9001",
    bus_id: "BUS_GJ_18_Z_9001",
    route_id: "ROUTE_NAVSARI_BARDOLI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "12:30",
    scheduled_arrival: "13:30",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "12:30"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "13:00"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "13:20"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "13:30"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_028_GJ_18_Z_7738",
    bus_id: "BUS_GJ_18_Z_7738",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "14:00",
    scheduled_arrival: "14:45",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "14:00"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "14:08"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "14:20"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "14:45"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_029_GJ_18_Z_7738",
    bus_id: "BUS_GJ_18_Z_7738",
    route_id: "ROUTE_NAVSARI_MASAD",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "15:10",
    scheduled_arrival: "16:40",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "15:10"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "15:45"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "16:00"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "16:10"
      },
      {
        stop_id: "STOP_MASAD",
        arrival_time: "16:40"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_030_GJ_18_Z_3665",
    bus_id: "BUS_GJ_18_Z_3665",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "14:30",
    scheduled_arrival: "15:10",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "14:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "14:35"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "14:50"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "15:10"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_031_GJ_18_Z_3665",
    bus_id: "BUS_GJ_18_Z_3665",
    route_id: "ROUTE_NAVSARI_BARDOLI_LINEAR",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "15:40",
    scheduled_arrival: "16:40",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "15:40"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "16:10"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "16:30"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "16:40"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_032_GJ_18_Z_9648",
    bus_id: "BUS_GJ_18_Z_9648",
    route_id: "ROUTE_SELAMBA_NAVSARI_2",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_SELAMBA_TO_DEDIAPADA",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "13:00",
    scheduled_arrival: "16:50",
    stop_times: [
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "13:00"
      },
      {
        stop_id: "STOP_DEDIAPADA",
        arrival_time: "13:35"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "14:15"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "15:15"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "15:35"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "15:55"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "16:01"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "16:50"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_033_GJ_18_Z_9648",
    bus_id: "BUS_GJ_18_Z_9648",
    route_id: "ROUTE_NAVSARI_SELAMBA_2",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: "<",
    current_segment: "SEG_NAVSARI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "08:10",
    scheduled_arrival: "12:05",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "08:10"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "08:55"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "09:02"
      },
      {
        stop_id: "STOP_KADOD",
        arrival_time: "09:30"
      },
      {
        stop_id: "STOP_MANDVI_SURAT",
        arrival_time: "09:50"
      },
      {
        stop_id: "STOP_NETRANG",
        arrival_time: "11:00"
      },
      {
        stop_id: "STOP_DEDIAPADA",
        arrival_time: "11:20"
      },
      {
        stop_id: "STOP_SELAMBA",
        arrival_time: "12:05"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_034_GJ_18_Z_4884",
    bus_id: "BUS_GJ_18_Z_4884",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "16:20",
    scheduled_arrival: "17:00",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "16:20"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "16:25"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "16:40"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "17:00"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_035_GJ_18_Z_4884",
    bus_id: "BUS_GJ_18_Z_4884",
    route_id: "ROUTE_NAVSARI_BARDOLI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "17:10",
    scheduled_arrival: "18:10",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "17:10"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "17:40"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "18:00"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "18:10"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_036_GJ_18_Z_8585",
    bus_id: "BUS_GJ_18_Z_8585",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "17:40",
    scheduled_arrival: "18:20",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "17:40"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "17:45"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "18:00"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "18:20"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_037_GJ_18_Z_8585",
    bus_id: "BUS_GJ_18_Z_8585",
    route_id: "ROUTE_NAVSARI_BARDOLI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_NAVSARI_TO_SARBHON",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "18:50",
    scheduled_arrival: "20:00",
    stop_times: [
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "18:50"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "19:20"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "19:45"
      },
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "20:00"
      }
    ],
    last_updated: 0
  },
  {
    trip_id: "TRIP_038_GJ_18_Z_9027",
    bus_id: "BUS_GJ_18_Z_9027",
    route_id: "ROUTE_BARDOLI_NAVSARI",
    service_date: "",
    service_pattern: "DAILY",
    direction_symbol: ">",
    current_segment: "SEG_BARDOLI_TO_BARDOLI_LINEAR",
    progress_percent: 0,
    delay_minutes: 0,
    live_status: "SCHEDULED",
    lifecycle_state: "SCHEDULED",
    scheduled_departure: "20:10",
    scheduled_arrival: "20:50",
    stop_times: [
      {
        stop_id: "STOP_BARDOLI",
        arrival_time: "20:10"
      },
      {
        stop_id: "STOP_BARDOLI_LINEAR",
        arrival_time: "20:15"
      },
      {
        stop_id: "STOP_SARBHON",
        arrival_time: "20:30"
      },
      {
        stop_id: "STOP_NAVSARI",
        arrival_time: "20:50"
      }
    ],
    last_updated: 0
  }
];
})();
