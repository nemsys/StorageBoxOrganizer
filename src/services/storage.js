import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'storage_box_organizer_data';

/**
 * @typedef {Object} Box
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} image - URL or base64
 * @property {number} createdAt
 */

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} boxId
 * @property {string} name
 * @property {string} description
 * @property {string} image - URL or base64
 * @property {string[]} tags
 * @property {number} createdAt
 */

/**
 * @typedef {Object} AppData
 * @property {Box[]} boxes
 * @property {Item[]} items
 */

const getData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return { boxes: [], items: [] };
  }
  return JSON.parse(data);
};

const saveData = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const storageService = {
  getBoxes: () => {
    const data = getData();
    return data.boxes.sort((a, b) => b.createdAt - a.createdAt);
  },

  getBox: (id) => {
    const data = getData();
    return data.boxes.find(b => b.id === id);
  },

  addBox: (box) => {
    const data = getData();
    const newBox = { ...box, id: uuidv4(), createdAt: Date.now() };
    data.boxes.push(newBox);
    saveData(data);
    return newBox;
  },

  deleteBox: (id) => {
    const data = getData();
    data.boxes = data.boxes.filter(b => b.id !== id);
    // Cascade delete items
    data.items = data.items.filter(i => i.boxId !== id);
    saveData(data);
  },

  getItems: (boxId) => {
    const data = getData();
    return data.items
      .filter(i => i.boxId === boxId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  getAllItems: () => {
    const data = getData();
    return data.items;
  },

  addItem: (item) => {
    const data = getData();
    const newItem = { ...item, id: uuidv4(), createdAt: Date.now() };
    data.items.push(newItem);
    saveData(data);
    return newItem;
  },

  deleteItem: (id) => {
    const data = getData();
    data.items = data.items.filter(i => i.id !== id);
    saveData(data);
  },

  // For testing/demo
  seed: () => {
    if (getData().boxes.length > 0) return;

    const boxId = uuidv4();
    const box = {
      id: boxId,
      name: 'Garage Tools',
      description: 'Tools and equipment stored in the garage',
      image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      createdAt: Date.now()
    };

    const item = {
      id: uuidv4(),
      boxId: boxId,
      name: 'Hammer',
      description: 'Heavy duty hammer',
      image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      tags: ['tool', 'construction'],
      createdAt: Date.now()
    };

    saveData({ boxes: [box], items: [item] });
  }
};
