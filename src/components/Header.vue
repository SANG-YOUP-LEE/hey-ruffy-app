<template>
    <!-- header -->
    <div class="m_header">
        <h1>hey, Ruffy!</h1>
        <p class="left">
            <a href="#none" @click.prevent="$emit('toggle-lnb')" class="temp"><img src="https://img.icons8.com/?size=100&id=36389&format=png&color=000000"><span>전체메뉴</span></a>
        </p>
        <p class="right">
            <a href="#none" @click.prevent="$emit('toggle-calendar')" class="temp"><img src="https://img.icons8.com/?size=100&id=M49y0HnG1sig&format=png&color=000000"><span>달력으로 보기</span></a>
        </p>
    </div>
    <!-- // header -->
</template>
