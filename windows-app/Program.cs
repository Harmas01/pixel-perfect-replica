using System.Diagnostics;

namespace LuckyAdmin;

internal static class Program
{
    private const string AdminUrl =
        "https://harmas01.github.io/pixel-perfect-replica/admin?v=windows-app";

    [STAThread]
    private static void Main()
    {
        try
        {
            var edgePath = FindMicrosoftEdge();

            if (edgePath is not null)
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = edgePath,
                    Arguments = $"--app=\"{AdminUrl}\" --start-maximized",
                    UseShellExecute = true
                });
                return;
            }

            OpenInDefaultBrowser();
        }
        catch
        {
            OpenInDefaultBrowser();
        }
    }

    private static string? FindMicrosoftEdge()
    {
        var candidates = new[]
        {
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Microsoft", "Edge", "Application", "msedge.exe")
        };

        return candidates.FirstOrDefault(File.Exists);
    }

    private static void OpenInDefaultBrowser()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = AdminUrl,
            UseShellExecute = true
        });
    }
}
