import { faker } from "@faker-js/faker";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import {
  ArticleModel,
  EventModel,
  PodcastModel,
  VideoModel,
} from "../models/PostModels";

export async function generateSPs(count: number) {
  for (let index = 0; index < count; index++) {
    const serviceprovider = new ServiceProviderRegModel({
      type: "test-fake",
      category: "test-fake",
      RegName: faker.internet.userName(),
      companyName: faker.company.name(),
      name: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      number: faker.number.int(),
      DOB: faker.date.birthdate(),
      address1: faker.location.streetAddress(),
      address2: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      description: faker.lorem.paragraph(),
      regNumber: faker.number.hex(),
    });

    await serviceprovider.save();
  }
}

export async function generateArticles(count: number) {
  for (let index = 0; index < count; index++) {
    const article = new ArticleModel({
      authorData: {
        id: "657abab4416d86cb739fb0a6",
        name: faker.internet.userName(),
        email: faker.internet.email(),
        type: "Trainers",
      },
      title: faker.lorem.text(),
      category: ["equity", "commodity", "forex", "bonds"],
      content: faker.lorem.paragraph(),
      schedule: faker.date.past(),
      disclaimer: faker.lorem.paragraph(),
    });

    await article.save();
  }
}

export async function generateVideos(count: number) {
  for (let index = 0; index < count; index++) {
    const video = new VideoModel({
      authorData: {
        id: "657ab5d3416d86cb739fb02d",
        name: faker.internet.userName(),
        email: faker.internet.email(),
        type: "Mutual Funds",
      },
      title: faker.lorem.text(),
      category: ["equity", "commodity", "forex", "bonds"],
      content: faker.lorem.paragraph(),
      schedule: faker.date.past(),
      disclaimer: faker.lorem.paragraph(),
      description: faker.lorem.paragraph(),
      link: faker.string.alphanumeric(),
    });

    await video.save();
  }
}

export async function generateEvents(count: number) {
  for (let index = 0; index < count; index++) {
    const event = new EventModel({
      authorData: {
        id: "6599c87a048dcc27a256ab38",
        name: faker.internet.userName(),
        email: faker.internet.email(),
        type: "Tax Experts",
      },
      title: faker.lorem.text(),
      category: ["equity", "commodity", "forex", "bonds"],
      content: faker.lorem.paragraph(),
      schedule: faker.date.past(),
      disclaimer: faker.lorem.paragraph(),
      description: faker.lorem.paragraph(),
      link: faker.string.alphanumeric(),
      eventEmail: faker.internet.email(),
      eventType: "hybrid",
    });

    await event.save();
  }
}

export async function generatePodcasts(count: number) {
  for (let index = 0; index < count; index++) {
    const podcast = new PodcastModel({
      authorData: {
        id: "6599c8d0048dcc27a256ab4b",
        name: faker.internet.userName(),
        email: faker.internet.email(),
        type: "Banking",
      },
      title: faker.lorem.text(),
      category: ["equity", "commodity", "forex", "bonds"],
      content: faker.lorem.paragraph(),
      schedule: faker.date.past(),
      disclaimer: faker.lorem.paragraph(),
      description: faker.lorem.paragraph(),
      link: faker.string.alphanumeric(),
      eventEmail: faker.internet.email(),
      image: faker.image.avatar(),
    });

    await podcast.save();
  }
}

export async function generateUsers(count: number) {
  for (let index = 0; index < count; index++) {
    const users = new UserModel({
      name: faker.internet.userName(),
      email: faker.internet.email(),
      number: faker.number.int(),
      password: faker.internet.password(),
    });

    await users.save();
  }
}
