package com.example.sundial.ui.theme

import androidx.compose.animation.core.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

// ---- Colour --------------------------------------------------------------

object SundialColors {
    val Canvas = Color(0xFFFFFFFF)
    val SurfaceSunken = Color(0xFFF4F4F6)
    val Ink = Color(0xFF0B0B0C)
    val Outline = Color(0xFF1A1A1C)
    val TextSecondary = Color(0xFF6B6B70)
    val TextTertiary = Color(0xFFC4C4C7)
    val Separator = Color(0xFFE6E6EA)
    val HeatEmpty = Color(0xFFE9E9EC)
    val PillFill = Color(0xFFF0F0F3)
    val BannerClose = Color(0xFFDDDDE2)
    val Scrim = Color(0x2E0B0B0C) // 18%
    val TipGround = Color(0xFF7FD8DE)

    val IntentMore = Color(0xFF34C759)
    val IntentLess = Color(0xFFFF9F0A)
    val Destructive = Color(0xFFFF3B30)
    val Confirm = Color(0xFF34C759)
    val Stat = Color(0xFF9AA3E0)
    val StatWash = Color(0xFFC9CEF0)

    val AccentPresets = listOf(
        Color(0xFFC2A24C), Color(0xFF7AB648), Color(0xFF4C8DC2),
        Color(0xFFC24C7A), Color(0xFF7A4CC2), Color(0xFFC2704C),
    )
}

/** Components read ONLY this, never the raw accent. */
@Immutable
data class AccentColors(
    val shadow: Color,
    val line: Color,
    val text: Color,
    val wash: Color,
    val fillMax: Color,
    val empty: Color,
) {
    fun fill(v: Float): Color = fillMax.copy(alpha = 0.15f + 0.85f * v.coerceIn(0f, 1f))
}

fun accentColorsOf(accent: Color) = AccentColors(
    shadow = lerp(accent, Color.White, 0.48f),
    line = accent,
    text = accent,
    wash = accent.copy(alpha = 0.22f),
    fillMax = accent,
    empty = SundialColors.HeatEmpty,
)

/** Animated derivation — §Motion 07. One 400ms tween, no stagger. */
@Composable
fun animatedAccentColors(accent: Color): AccentColors {
    val spec = tween<Color>(400)
    val shadow by animateColorAsState(lerp(accent, Color.White, 0.48f), spec, label = "shadow")
    val base by animateColorAsState(accent, spec, label = "accent")
    return AccentColors(shadow, base, base, base.copy(alpha = 0.22f), base, SundialColors.HeatEmpty)
}

val LocalAccent = staticCompositionLocalOf { accentColorsOf(SundialColors.AccentPresets[0]) }

// ---- Elevation -----------------------------------------------------------

object SundialElevation {
    val OutlineWidth = 1.5.dp
    val Offset = 3.dp
    val OffsetChip = 2.dp
    val OffsetSection = 4.dp
    val OffsetHero = 5.dp
}

// ---- Shape ---------------------------------------------------------------

object SundialShapes {
    val PillSm = RoundedCornerShape(8.dp)
    val Stepper = RoundedCornerShape(10.dp)
    val Field = RoundedCornerShape(12.dp)
    val Button = RoundedCornerShape(14.dp)
    val Card = RoundedCornerShape(16.dp)
    val Section = RoundedCornerShape(20.dp)
    val Pill = RoundedCornerShape(percent = 50)
    val Cell = RoundedCornerShape(4.dp)
}

// ---- Type ----------------------------------------------------------------
// Bundle Nunito (OFL) in res/font: nunito_semibold, _bold, _extrabold, _black.

val Rounded = FontFamily(
    Font(com.example.sundial.R.font.nunito_semibold, FontWeight.SemiBold),
    Font(com.example.sundial.R.font.nunito_bold, FontWeight.Bold),
    Font(com.example.sundial.R.font.nunito_extrabold, FontWeight.ExtraBold),
    Font(com.example.sundial.R.font.nunito_black, FontWeight.Black),
)

object SundialType {
    private fun s(size: Int, w: FontWeight, ls: Double = 0.0, lh: Double? = null) = TextStyle(
        fontFamily = Rounded, fontSize = size.sp, fontWeight = w, letterSpacing = ls.em,
        lineHeight = lh?.let { (size * it).sp } ?: TextStyle.Default.lineHeight,
    )
    val DisplayStat = s(62, FontWeight.Black, -0.04, 1.0)
    val DisplayUnit = s(34, FontWeight.Black, -0.02, 1.0)
    val TitleScreen = s(38, FontWeight.Black, -0.035, 1.1)
    val TitleModal = s(30, FontWeight.Black, -0.03, 1.1)
    val TitleSection = s(24, FontWeight.Black, -0.02, 1.1)
    val ItemTitle = s(19, FontWeight.ExtraBold, -0.01, 1.1)
    val Metric = s(17, FontWeight.ExtraBold)
    val RowLabel = s(16, FontWeight.Bold)
    val RowValue = s(15, FontWeight.Bold)
    val Button = s(15, FontWeight.ExtraBold)
    val Caption = s(13, FontWeight.SemiBold, lh = 1.5)
    val GroupHeader = s(13, FontWeight.Bold)
    val ArcMicro = s(11, FontWeight.ExtraBold, 0.08)
}

// ---- Motion (five curves; do not add a sixth) ---------------------------

object SundialMotion {
    fun <T> snap(): AnimationSpec<T> = tween(180, easing = FastOutSlowInEasing)
    fun <T> pop(): AnimationSpec<T> = spring(dampingRatio = 0.62f, stiffness = 420f)
    fun <T> commit(): AnimationSpec<T> = spring(dampingRatio = 0.42f, stiffness = 360f)
    val EaseOutQuint = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)
    fun <T> sheet(ms: Int = 380): AnimationSpec<T> = tween(ms, easing = EaseOutQuint)
    fun <T> settle(index: Int = 0): AnimationSpec<T> = tween(220, delayMillis = index * 28, easing = EaseOutQuint)

    fun <T> pressDown(): AnimationSpec<T> = tween(90, easing = LinearOutSlowInEasing)
    fun <T> pressUp(): AnimationSpec<T> = spring(dampingRatio = 0.55f, stiffness = 400f)
    fun <T> expand(): AnimationSpec<T> = spring(dampingRatio = 0.70f, stiffness = 340f)

    const val ArcIdlePeriodMs = 28_000
    const val ArcRunningPeriodMs = 8_000
    const val HaloPeriodMs = 1_600
    const val StaggerMs = 28
    const val HeatStaggerMs = 14
    const val RecolorMs = 400
}
