<script setup lang="ts">
const foodItems = [
  '🍞',
  '🥖',
  '🥐',
  '🍕',
  '🍔',
  '🌮',
  '🍟',
  '🥪',
  '🌭',
  '🍖',
  '🥙',
  '🍗',
  '🥓',
  '🥩',
  '🍳',
  '🧀',
  '🥚',
  '🍱',
  '🥗',
  '🍝',
  '🍜',
  '🍲',
  '🍛',
  '🍣',
  '🍤',
  '🥟',
  '🥡',
  '🦐',
  '🦞',
  '🦀',
  '🐟',
  '🥘',
  '🍚',
  '🥫',
  '🧆',
  '🥧',
  '🧁',
  '🍰',
  '🎂',
  '🍪',
]
</script>

<template>
  <div class="food-bg" aria-hidden="true">
    <div v-for="item in foodItems" :key="item" class="food-item">
      {{ item }}
    </div>
  </div>
</template>

<style scoped>
.food-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
}

.food-item {
  position: absolute;
  font-size: 50px;
  opacity: 0.08;
  filter: grayscale(100%) brightness(0.7);
}

.food-item:nth-child(1) { left: 5%; top: 10%; }
.food-item:nth-child(2) { left: 15%; top: 10%; }
.food-item:nth-child(3) { left: 25%; top: 10%; }
.food-item:nth-child(4) { left: 35%; top: 10%; }
.food-item:nth-child(5) { left: 45%; top: 10%; }
.food-item:nth-child(6) { left: 55%; top: 10%; }
.food-item:nth-child(7) { left: 65%; top: 10%; }
.food-item:nth-child(8) { left: 75%; top: 10%; }
.food-item:nth-child(9) { left: 85%; top: 10%; }
.food-item:nth-child(10) { left: 95%; top: 10%; }

.food-item:nth-child(11) { left: 5%; top: 25%; }
.food-item:nth-child(12) { left: 15%; top: 25%; }
.food-item:nth-child(13) { left: 25%; top: 25%; }
.food-item:nth-child(14) { left: 35%; top: 25%; }
.food-item:nth-child(15) { left: 45%; top: 25%; }
.food-item:nth-child(16) { left: 55%; top: 25%; }
.food-item:nth-child(17) { left: 65%; top: 25%; }
.food-item:nth-child(18) { left: 75%; top: 25%; }
.food-item:nth-child(19) { left: 85%; top: 25%; }
.food-item:nth-child(20) { left: 95%; top: 25%; }

.food-item:nth-child(21) { left: 5%; top: 40%; }
.food-item:nth-child(22) { left: 15%; top: 40%; }
.food-item:nth-child(23) { left: 25%; top: 40%; }
.food-item:nth-child(24) { left: 35%; top: 40%; }
.food-item:nth-child(25) { left: 45%; top: 40%; }
.food-item:nth-child(26) { left: 55%; top: 40%; }
.food-item:nth-child(27) { left: 65%; top: 40%; }
.food-item:nth-child(28) { left: 75%; top: 40%; }
.food-item:nth-child(29) { left: 85%; top: 40%; }
.food-item:nth-child(30) { left: 95%; top: 40%; }

.food-item:nth-child(31) { left: 5%; top: 55%; }
.food-item:nth-child(32) { left: 15%; top: 55%; }
.food-item:nth-child(33) { left: 25%; top: 55%; }
.food-item:nth-child(34) { left: 35%; top: 55%; }
.food-item:nth-child(35) { left: 45%; top: 55%; }
.food-item:nth-child(36) { left: 55%; top: 55%; }
.food-item:nth-child(37) { left: 65%; top: 55%; }
.food-item:nth-child(38) { left: 75%; top: 55%; }
.food-item:nth-child(39) { left: 85%; top: 55%; }
.food-item:nth-child(40) { left: 95%; top: 55%; }
</style>
