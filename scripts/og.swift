// Renders src/assets/og.png (1200x630) from site.config.json's name + the app icon.
// Run with: npm run og   (macOS only). Re-run after renaming.
import AppKit

let root = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().deletingLastPathComponent()
let cfgData = try Data(contentsOf: root.appendingPathComponent("site.config.json"))
let name = (try JSONSerialization.jsonObject(with: cfgData) as! [String: Any])["name"] as! String
let W = 1200, H = 630

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8,
                           samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

NSColor(red: 0, green: 0, blue: 0, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: W, height: H).fill()

let glow = NSGradient(colors: [NSColor(white: 1, alpha: 0.10), NSColor(white: 1, alpha: 0)])!
glow.draw(fromCenter: NSPoint(x: 930, y: 400), radius: 0, toCenter: NSPoint(x: 930, y: 400), radius: 560, options: [])

if let icon = NSImage(contentsOf: root.appendingPathComponent("src/assets/app-icon.png")) {
    icon.draw(in: NSRect(x: 96, y: 410, width: 120, height: 120))
}

func text(_ s: String, size: CGFloat, weight: NSFont.Weight, color: NSColor, at p: NSPoint, kern: CGFloat = 0) {
    NSAttributedString(string: s, attributes: [
        .font: NSFont.systemFont(ofSize: size, weight: weight), .foregroundColor: color, .kern: kern,
    ]).draw(at: p)
}
let white = NSColor(white: 0.96, alpha: 1), grey = NSColor(white: 0.62, alpha: 1)
text(name, size: 44, weight: .semibold, color: white, at: NSPoint(x: 236, y: 452))
text("Zero Egress.", size: 104, weight: .bold, color: white, at: NSPoint(x: 92, y: 250), kern: -3)
text("Zero Exceptions.", size: 104, weight: .bold, color: grey, at: NSPoint(x: 92, y: 140), kern: -3)
text("The on-device meeting copilot for M&A and litigation.", size: 30, weight: .regular, color: grey, at: NSPoint(x: 96, y: 64))

NSGraphicsContext.restoreGraphicsState()
let out = root.appendingPathComponent("src/assets/og.png")
try rep.representation(using: .png, properties: [:])!.write(to: out)
print("wrote \(out.path)")
