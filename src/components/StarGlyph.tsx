/**
 * Eight-spoked "fofo" sparkle as inline SVG.
 *
 * Replaces the ✳ (U+2733) character, which iOS/Android force-render as a
 * green emoji regardless of CSS color. SVG gives us full control of shape,
 * color (currentColor), and crispness across every platform.
 */
export default function StarGlyph({
    size = 24,
    className = "",
    style,
}: {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            focusable="false"
            className={className}
            style={style}
        >
            {/* four overlapping spokes → eight-point sparkle */}
            <path d="M12 0c.7 4.3 1.4 5.6 3 7 -1.6 1.4-2.3 2.7-3 7 -.7-4.3-1.4-5.6-3-7 1.6-1.4 2.3-2.7 3-7Z" transform="translate(0 5)" />
            <path d="M12 0c.7 4.3 1.4 5.6 3 7 -1.6 1.4-2.3 2.7-3 7 -.7-4.3-1.4-5.6-3-7 1.6-1.4 2.3-2.7 3-7Z" transform="translate(0 5) rotate(90 12 7)" />
            <path d="M12 1.5c.5 3 1 4 2.1 5 -1.1 1-1.6 2-2.1 5 -.5-3-1-4-2.1-5 1.1-1 1.6-2 2.1-5Z" transform="translate(0 5.5) rotate(45 12 6.5)" />
            <path d="M12 1.5c.5 3 1 4 2.1 5 -1.1 1-1.6 2-2.1 5 -.5-3-1-4-2.1-5 1.1-1 1.6-2 2.1-5Z" transform="translate(0 5.5) rotate(135 12 6.5)" />
        </svg>
    );
}
