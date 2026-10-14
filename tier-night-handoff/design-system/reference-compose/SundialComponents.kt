package com.example.sundial.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.sundial.ui.theme.*

/**
 * The only elevation in the system.
 * Draws a copy of the shape at (+offset, +offset), filled with [fill] and outlined 1.5dp in Outline,
 * then the object's own white fill + 1.5dp outline on top. 0 blur, always down-right.
 * Equivalent CSS: border 1.5px #1A1A1C; box-shadow: 3px 3px 0 0 fill, 3px 3px 0 1.5px #1A1A1C.
 */
fun Modifier.hardSurface(
    radius: Dp,
    fill: Color,
    offset: Dp = SundialElevation.Offset,
    background: Color = SundialColors.Canvas,
    outline: Color = SundialColors.Outline,
    outlineWidth: Dp = SundialElevation.OutlineWidth,
): Modifier = this.drawBehind {
    val r = radius.toPx()
    val o = offset.toPx()
    val w = outlineWidth.toPx()
    if (o > 0f) {
        // shadow outline (spread = outline width), then shadow fill
        drawRoundRect(outline, Offset(o - w, o - w), Size(size.width + 2 * w, size.height + 2 * w), CornerRadius(r + w))
        drawRoundRect(fill, Offset(o, o), size, CornerRadius(r))
    }
    // object: outline sits inside the bounds like a CSS border
    drawRoundRect(outline, Offset.Zero, size, CornerRadius(r))
    drawRoundRect(background, Offset(w, w), Size(size.width - 2 * w, size.height - 2 * w), CornerRadius((r - w).coerceAtLeast(0f)))
}

/**
 * §Motion 01 — press drops the object onto its shadow.
 * Down: translate(3,3) + offset 3→0 over 90ms. Up: spring(0.55, 400). No scale.
 */
@Composable
fun Modifier.pressDrop(
    radius: Dp,
    fill: Color,
    interaction: MutableInteractionSource,
    restOffset: Dp = SundialElevation.Offset,
    background: Color = SundialColors.Canvas,
): Modifier {
    val pressed by interaction.collectIsPressedAsState()
    val drop by animateDpAsState(
        if (pressed) restOffset else 0.dp,
        if (pressed) SundialMotion.pressDown() else SundialMotion.pressUp(),
        label = "drop",
    )
    return this
        .offset(drop, drop)
        .hardSurface(radius, fill, offset = restOffset - drop, background = background)
}

// ---- Object card ---------------------------------------------------------

@Composable
fun ObjectCard(
    emoji: String,
    name: String,
    metric: String,
    timeframe: String,
    accent: AccentColors = LocalAccent.current,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val src = remember { MutableInteractionSource() }
    Row(
        modifier
            .fillMaxWidth()
            .pressDrop(16.dp, accent.shadow, src)
            .clip(SundialShapes.Card)
            .combinedClickable(src, indication = null, onClick = onClick, onLongClick = onLongClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SymbolToken(emoji, accent.wash, 40.dp)
        Text(name, style = SundialType.ItemTitle, color = SundialColors.Ink, modifier = Modifier.weight(1f))
        Column(horizontalAlignment = Alignment.End) {
            Text(metric, style = SundialType.Metric, color = accent.text)
            Text(timeframe, style = SundialType.GroupHeader, color = SundialColors.TextSecondary)
        }
    }
}

@Composable
fun SymbolToken(emoji: String, wash: Color, size: Dp = 40.dp) {
    Box(
        Modifier.size(size).clip(CircleShape).background(wash)
            .border(SundialElevation.OutlineWidth, SundialColors.Outline, CircleShape),
        contentAlignment = Alignment.Center,
    ) { Text(emoji, fontSize = (size.value * 0.48f).sp()) }
}

private fun Float.sp() = androidx.compose.ui.unit.TextUnit(this, androidx.compose.ui.unit.TextUnitType.Sp)

// ---- Buttons -------------------------------------------------------------

@Composable
fun PrimaryButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, leading: String? = null, fullWidth: Boolean = false) {
    val src = remember { MutableInteractionSource() }
    val accent = LocalAccent.current
    Row(
        modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .pressDrop(14.dp, accent.shadow, src)
            .clickable(src, indication = null, onClick = onClick)
            .padding(horizontal = if (fullWidth) 20.dp else 24.dp, vertical = 13.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        leading?.let { Text(it, fontSize = 17f.sp(), color = SundialColors.Ink) }
        Text(label, style = SundialType.Button, color = SundialColors.Ink)
    }
}

enum class IconButtonTone { Neutral, Cancel, Confirm }

@Composable
fun SundialIconButton(glyph: String, onClick: () -> Unit, tone: IconButtonTone = IconButtonTone.Neutral, size: Dp = 40.dp) {
    val src = remember { MutableInteractionSource() }
    val color = when (tone) {
        IconButtonTone.Neutral -> SundialColors.Ink
        IconButtonTone.Cancel -> SundialColors.Destructive
        IconButtonTone.Confirm -> SundialColors.Confirm
    }
    Box(
        Modifier.size(size)
            .pressDrop(size / 2, LocalAccent.current.shadow, src)
            .clip(CircleShape)
            .clickable(src, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(glyph, style = SundialType.Button, color = color) }
}

/** Quick-adjust chip: flat (no shadow). Active press = scale 0.92 on pop. */
@Composable
fun QuickChip(label: String, onClick: () -> Unit) {
    val src = remember { MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.92f else 1f, SundialMotion.pop(), label = "chip")
    Box(
        Modifier.graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(SundialShapes.Pill)
            .background(SundialColors.Canvas)
            .border(SundialElevation.OutlineWidth, SundialColors.Outline, SundialShapes.Pill)
            .clickable(src, indication = null, onClick = onClick)
            .padding(horizontal = 15.dp, vertical = 7.dp),
    ) { Text(label, style = SundialType.Button.copy(fontSize = 14f.sp()), color = SundialColors.Ink) }
}

/** §Motion 05 — ✓ commit bounce: 1 → 0.8 (90ms) → spring(0.42, 360) back to 1 (peaks ~1.25). */
@Composable
fun CommitButton(onCommit: () -> Unit, enabled: Boolean) {
    val scale = remember { Animatable(1f) }
    var fire by remember { mutableIntStateOf(0) }
    LaunchedEffect(fire) {
        if (fire > 0) {
            scale.animateTo(0.8f, tween(90))
            scale.animateTo(1f, SundialMotion.commit())
            onCommit()
        }
    }
    Box(Modifier.graphicsLayer { scaleX = scale.value; scaleY = scale.value }) {
        SundialIconButton("✓", onClick = { if (enabled) fire++ }, tone = IconButtonTone.Confirm)
    }
}

// ---- Inset group + rows --------------------------------------------------

@Composable
fun InsetGroup(header: String? = null, footer: String? = null, content: @Composable ColumnScope.() -> Unit) {
    Column {
        header?.let { Text(it, style = SundialType.GroupHeader, color = SundialColors.TextSecondary, modifier = Modifier.padding(start = 4.dp, bottom = 6.dp)) }
        Column(
            Modifier.fillMaxWidth()
                .hardSurface(16.dp, LocalAccent.current.shadow)
                .clip(SundialShapes.Card),
            content = content,
        )
        footer?.let { Text(it, style = SundialType.Caption, color = SundialColors.TextSecondary, modifier = Modifier.padding(start = 4.dp, end = 4.dp, top = 8.dp)) }
    }
}

@Composable
fun InsetRow(label: String, last: Boolean = false, onClick: (() -> Unit)? = null, trailing: @Composable RowScope.() -> Unit = {}) {
    Column {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 48.dp)
                .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
                .padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(label, style = SundialType.RowLabel, color = SundialColors.Ink, modifier = Modifier.weight(1f))
            trailing()
        }
        if (!last) Box(Modifier.fillMaxWidth().height(1.5.dp).background(SundialColors.Separator))
    }
}

@Composable fun RowScope.MenuTrailing(value: String) {
    Text(value, style = SundialType.RowValue, color = SundialColors.TextSecondary)
    Text("⌃⌄", fontSize = 12f.sp(), color = SundialColors.TextSecondary)
}
@Composable fun RowScope.PushTrailing() { Text("›", style = SundialType.RowLabel.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold), color = SundialColors.TextTertiary) }
@Composable fun RowScope.DatePill(text: String) {
    Text(text, style = SundialType.Button.copy(fontSize = 14f.sp()), color = SundialColors.Ink,
        modifier = Modifier.clip(SundialShapes.PillSm).background(SundialColors.PillFill).padding(horizontal = 12.dp, vertical = 6.dp))
}

// ---- More Options (§Motion 04) -------------------------------------------

@Composable
fun MoreOptions(expanded: Boolean, onToggle: () -> Unit, rows: List<Pair<String, String>>) {
    val accent = LocalAccent.current
    val turn by animateFloatAsState(if (expanded) 45f else 0f, SundialMotion.expand(), label = "plus")
    Column(Modifier.animateContentSize(SundialMotion.expand())) {
        Row(
            Modifier.fillMaxWidth().hardSurface(16.dp, accent.shadow).clip(SundialShapes.Card)
                .clickable(onClick = onToggle).padding(horizontal = 16.dp, vertical = 15.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("More Options", style = SundialType.RowLabel, color = SundialColors.Ink, modifier = Modifier.weight(1f))
            Text("+", style = SundialType.Metric.copy(fontSize = 20f.sp()), color = SundialColors.TextSecondary, modifier = Modifier.rotate(turn))
        }
        if (expanded) {
            // Reserve room for the hard shadow — clipping here cuts its corners.
            Box(Modifier.padding(top = 12.dp, end = 6.dp, bottom = 6.dp)) {
                InsetGroup {
                    rows.forEachIndexed { i, (label, value) ->
                        val state = remember { MutableTransitionState(false) }.apply { targetState = true }
                        AnimatedVisibility(
                            visibleState = state,
                            enter = fadeIn(tween(220, delayMillis = 60 + i * SundialMotion.StaggerMs)) +
                                slideInVertically(tween(220, delayMillis = 60 + i * SundialMotion.StaggerMs)) { 8 },
                        ) { InsetRow(label, last = i == rows.lastIndex) { MenuTrailing(value) } }
                    }
                }
            }
        }
    }
}

// ---- Floating pill tab bar (§Motion 02) ----------------------------------

data class TabItem(val icon: String, val label: String)

@Composable
fun PillTabBar(items: List<TabItem>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier.hardSurface(999.dp, SundialColors.HeatEmpty).padding(6.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        items.forEachIndexed { i, item ->
            val active = i == selected
            val bg by animateColorAsState(if (active) SundialColors.Ink else Color.Transparent, SundialMotion.snap(), label = "tabBg")
            Row(
                Modifier.clip(SundialShapes.Pill).background(bg)
                    .clickable { onSelect(i) }
                    .animateContentSize(SundialMotion.pop())
                    .padding(horizontal = if (active) 16.dp else 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(item.icon, fontSize = 16f.sp(), color = if (active) Color.White else SundialColors.TextSecondary)
                AnimatedVisibility(
                    visible = active,
                    enter = fadeIn(tween(140)) + expandHorizontally(SundialMotion.pop()),
                    exit = fadeOut(tween(90)) + shrinkHorizontally(tween(180)),
                ) {
                    Text(item.label, style = SundialType.Button, color = Color.White, maxLines = 1, modifier = Modifier.padding(start = 8.dp))
                }
            }
        }
    }
}

// ---- Arc CTA (§Motion 03) ------------------------------------------------

@Composable
fun ArcCta(label: String, running: Boolean, onToggle: () -> Unit) {
    val accent = LocalAccent.current
    val period by animateIntAsState(
        if (running) SundialMotion.ArcRunningPeriodMs else SundialMotion.ArcIdlePeriodMs, tween(600), label = "period",
    )
    val spin = rememberInfiniteTransition(label = "arc")
    val angle by spin.animateFloat(0f, 360f, infiniteRepeatable(tween(period, easing = LinearEasing)), label = "angle")
    val ringColor by animateColorAsState(if (running) accent.line else SundialColors.TextSecondary, tween(600), label = "ring")
    val halo by spin.animateFloat(0f, 1f, infiniteRepeatable(tween(SundialMotion.HaloPeriodMs, easing = LinearOutSlowInEasing)), label = "halo")

    Box(Modifier.size(150.dp), contentAlignment = Alignment.Center) {
        ArcText(label.uppercase() + "  •  ", radius = 62.dp, color = ringColor, modifier = Modifier.graphicsLayer { rotationZ = angle })
        if (running) Box(
            Modifier.size(72.dp).graphicsLayer {
                val s = 1f + 0.8f * halo; scaleX = s; scaleY = s; alpha = 0.4f * (1f - halo)
            }.clip(CircleShape).background(accent.line.copy(alpha = 0.45f)),
        )
        val src = remember { MutableInteractionSource() }
        Box(
            Modifier.size(72.dp).pressDrop(36.dp, accent.shadow, src).clip(CircleShape)
                .clickable(src, indication = null, onClick = onToggle),
            contentAlignment = Alignment.Center,
        ) {
            AnimatedContent(running, transitionSpec = {
                (fadeIn(tween(120)) togetherWith fadeOut(tween(120)))
            }, label = "glyph") { r -> Text(if (r) "⏸" else "▶", fontSize = 26f.sp(), color = SundialColors.Ink) }
        }
    }
}

/** Places [text] repeated 3× evenly on a circle. Implementation detail left to the codebase (Canvas + drawText per glyph). */
@Composable
expect fun ArcText(text: String, radius: Dp, color: Color, modifier: Modifier = Modifier)
