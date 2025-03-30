import { createRouter, createWebHistory } from "vue-router";
import MarkdownViewer from "../views/MarkdownReviewer.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: MarkdownViewer,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
