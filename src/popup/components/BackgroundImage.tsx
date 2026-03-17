import { forwardRef, type CSSProperties } from 'react';
import { Flex, type FlexProps } from '@radix-ui/themes';
import clsx from 'clsx';

type Props = FlexProps & {
    imageUrl?: string;
    gradient?: string;
    zoom?: number;
    position?: string;
    showGradient?: boolean;
    dim?: number;
    blur?: number;
};

export const BackgroundImage = forwardRef<HTMLDivElement, Props>(
    function BackgroundImage(
        {
            imageUrl,
            gradient,
            zoom = 1.06,
            position = 'center',
            showGradient = false,
            dim = 0.28,
            blur = 1,
            className,
            style,
            children,
            ...flexProps
        },
        ref
    ) {
        const hasImage = Boolean(imageUrl);
        const shouldShow = showGradient || hasImage;
        const backgroundImage = shouldShow
            ? hasImage && gradient
                ? `${gradient}, url(${imageUrl})`
                : hasImage
                  ? `url(${imageUrl})`
                  : gradient
            : undefined;
        const backgroundSize =
            hasImage && zoom ? `${Math.round(zoom * 100)}%` : undefined;
        const backgroundStyle: CSSProperties | undefined = shouldShow
            ? {
                  backgroundImage,
                  backgroundSize,
                  backgroundPosition: position,
                  backgroundRepeat: 'no-repeat',
              }
            : undefined;
        const shouldOverlay = shouldShow && (dim > 0 || blur > 0);

        return (
            <Flex
                {...flexProps}
                ref={ref}
                className={clsx('relative isolate', className)}
                style={{ ...backgroundStyle, ...style }}
            >
                {shouldOverlay && (
                    <div
                        data-bg-overlay
                        className="pointer-events-none absolute inset-0 z-0"
                        style={{
                            backgroundColor:
                                dim > 0 ? `rgba(0, 0, 0, ${dim})` : undefined,
                            backdropFilter:
                                blur > 0 ? `blur(${blur}px)` : undefined,
                            WebkitBackdropFilter:
                                blur > 0 ? `blur(${blur}px)` : undefined,
                        }}
                    />
                )}
                {children}
            </Flex>
        );
    }
);
