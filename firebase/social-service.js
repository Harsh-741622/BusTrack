import { realtimePaths } from "./realtime-paths.js";
import { realtimeService } from "./realtime-service.js";

export const socialService = {
  setUserPresence: async function (userId, presence) {
    const timestamp = await realtimeService.timestamp();

    return realtimeService.write(realtimePaths.userPresence(userId), {
      status: presence.status || "online",
      page: presence.page || "",
      routeId: presence.routeId || "",
      busId: presence.busId || "",
      updatedAt: timestamp
    });
  },

  subscribeToRoom: function (roomId, onRoom, onError) {
    return realtimeService.subscribe(
      realtimePaths.socialRoom(roomId),
      onRoom,
      onError
    );
  },

  subscribeToMessages: function (roomId, onMessages, onError) {
    return realtimeService.subscribe(
      realtimePaths.socialMessages(roomId),
      onMessages,
      onError
    );
  },

  sendMessage: async function (roomId, message) {
    const timestamp = await realtimeService.timestamp();

    return realtimeService.add(realtimePaths.socialMessages(roomId), {
      userId: message.userId || "anonymous",
      text: message.text || "",
      createdAt: timestamp
    });
  }
};
