import { Request, Response } from "express";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { Socket } from "socket.io";
import { messageModel } from "../models/MessagingModel";

export const searchMembers = async (req: Request, res: Response) => {
  const { id, role } = req.query;

  if (!id || !role) {
    return res.status(400).json({
      success: false,
      message: "No id or role provided",
    });
  }

  try {
    let messageArr;

    if (role === "user") {
      const user = await UserModel.findById(id)
        .populate("stats.Following", "name role category profileUrl")
        .sort({ createdAt: -1 });

      messageArr = user?.stats?.Following;
    } else if (role === "provider") {
      const sp = await ServiceProviderRegModel.findById(id)
        .populate("stats.Following", "name role category profileUrl")
        .sort({ createdAt: -1 });
      messageArr = sp?.stats?.Following;
    }

    return res
      .status(200)
      .json({ success: true, message: "Fetched", data: messageArr });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "failed to fetch members",
      error: error,
    });
  }
};

export const getprofile = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "No id provided",
    });
  }

  try {
    let profile;

    const isSP = await ServiceProviderRegModel.findById(id);
    const isUser = await UserModel.findById(id);

    if (Boolean(isSP)) {
      profile = await ServiceProviderRegModel.findById(id).select(
        "RegName profileUrl category"
      );
    } else if (Boolean(isUser)) {
      profile = await UserModel.findById(id).select(
        "RegName profileUrl category"
      );
    }

    return res.status(200).json({
      success: true,
      message: "service fetched",
      data: profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "failed to fetch details",
      error: error,
    });
  }
};

export const getPrevConvos = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "No id or role provided",
    });
  }

  try {
    const messageArr = await messageModel
      .find({
        receiver: id,
      })
      .select("sender");

    const msgIds = messageArr.map((msg) => {
      return msg.sender;
    });

    const SP = await UserModel.find({ _id: { $in: msgIds } }).select(
      "name role category profileUrl"
    );

    const user = await ServiceProviderRegModel.find({
      _id: { $in: msgIds },
    }).select("name role category profileUrl");

    const CombinedArr = [...SP, ...user];

    return res
      .status(200)
      .json({ success: true, message: "Fetched", data: CombinedArr });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "failed to fetch messages",
      error: error,
    });
  }
};

const sockets: Record<string, string> = {};

export const handleLiveMessaging = async (socket: Socket) => {
  socket.on("details", async ({ senderId, receiverId }) => {
    try {
      sockets[senderId] = socket.id;

      const Messages = await messageModel.find({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      });

      socket.emit("getmessages", Messages);
    } catch (error) {
      // console.log(error);
    }
  });

  socket.on("message", async ({ senderId, receiverId, message }) => {
    try {
      const newMessage = new messageModel({
        sender: senderId,
        receiver: receiverId,
        content: message,
      });

      newMessage.save();
      const Messages = await messageModel.find({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      });

      socket.emit("getmessages", Messages);
      socket.to(sockets[senderId]).emit("getmessages", Messages);
      socket.to(sockets[receiverId]).emit("getmessages", Messages);
    } catch (error) {
      // console.log(error);
    }
  });
};
