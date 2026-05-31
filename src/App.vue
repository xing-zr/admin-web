<script setup lang="ts"></script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="app-fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>
