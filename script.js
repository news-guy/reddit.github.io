document.addEventListener("DOMContentLoaded", function () {
  const postsContainer = document.getElementById("posts-container");
  const subredditInput = document.getElementById("subreddit-input");
  const loadButton = document.getElementById("load-button");
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");

  let currentSubreddit = "all";
  let after = null;
  let before = null;
  let currentPosts = [];
  // Add variables to track comment viewing state
  let viewingComments = false;
  let currentPostId = null;
  let currentPostPermalink = null;
  // Add variable to track loaded comments
  let loadedComments = [];
  // Add variable to track original post text
  let fullPostText = "";

  // Add event listener for Enter key in subreddit input
  subredditInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      loadButton.click();
    }
  });

  loadButton.addEventListener("click", function () {
    currentSubreddit = subredditInput.value.trim();
    if (currentSubreddit) {
      // Reset comments view when loading new subreddit
      viewingComments = false;
      fetchPosts(currentSubreddit);
    }
  });

  prevButton.addEventListener("click", function () {
    // If viewing comments, go back to posts
    if (viewingComments) {
      viewingComments = false;
      fetchPosts(currentSubreddit);
    } else if (before) {
      fetchPosts(currentSubreddit, null, before);
    }
  });

  nextButton.addEventListener("click", function () {
    // Only navigate to next page if not viewing comments
    if (!viewingComments && after) {
      fetchPosts(currentSubreddit, after);
    }
  });

  function fetchPosts(subreddit, afterParam = null, beforeParam = null) {
    postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
    prevButton.disabled = true;
    nextButton.disabled = true;

    // Reduce limit to 5 posts for faster loading on Kindle
    let url = `https://www.reddit.com/r/${subreddit}.json?limit=5`;
    if (afterParam) {
      url += `&after=${afterParam}`;
    }
    if (beforeParam) {
      url += `&before=${beforeParam}`;
    }

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        displayPosts(data.data);
      })
      .catch((error) => {
        postsContainer.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
      });
  }

  // Add new function to fetch comments
  function fetchComments(permalink) {
    postsContainer.innerHTML = '<div class="loading">Loading comments...</div>';
    prevButton.disabled = false; // Enable back button
    nextButton.disabled = true; // Disable next button when viewing comments

    const url = `https://www.reddit.com${permalink}.json`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        // Store comments for later use when loading more
        loadedComments = data[1].data.children;
        displayComments(data);
      })
      .catch((error) => {
        postsContainer.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
      });
  }

  function displayPosts(data) {
    postsContainer.innerHTML = "";
    currentPosts = data.children;

    if (currentPosts.length === 0) {
      postsContainer.innerHTML = '<div class="loading">No posts found</div>';
      return;
    }

    after = data.after;
    before = data.before;

    prevButton.disabled = !before;
    nextButton.disabled = !after;

    const currentSubredditDisplay = document.createElement("div");
    currentSubredditDisplay.textContent = "r/" + currentSubreddit;
    currentSubredditDisplay.style.textAlign = "center";
    currentSubredditDisplay.style.fontWeight = "bold";
    currentSubredditDisplay.style.marginBottom = "15px";
    currentSubredditDisplay.style.fontSize = "18px";
    postsContainer.appendChild(currentSubredditDisplay);

    currentPosts.forEach((post) => {
      const postData = post.data;
      const postElement = document.createElement("div");
      postElement.className = "post";

      const title = document.createElement("div");
      title.className = "post-title";
      title.textContent = postData.title;

      const info = document.createElement("div");
      info.className = "post-info";
      info.textContent = `u/${postData.author} • ${formatScore(
        postData.score
      )} points • ${formatComments(postData.num_comments)}`;

      const content = document.createElement("div");
      content.className = "post-content";

      // If post has text content (selftext), truncate to 150 chars for Kindle
      if (postData.selftext) {
        // Store full text in a data attribute for expanding later
        content.dataset.fullText = postData.selftext;
        content.textContent = truncateText(postData.selftext, 150);

        // Only add expand button if text is truncated
        if (postData.selftext.length > 150) {
          const expandButton = document.createElement("button");
          expandButton.textContent = "Show full text";
          expandButton.style.fontSize = "14px";
          expandButton.style.padding = "5px";
          expandButton.style.marginTop = "10px";
          expandButton.style.backgroundColor = "transparent";
          expandButton.style.border = "1px solid #ccc";
          expandButton.style.width = "100%";

          expandButton.addEventListener("click", function (event) {
            event.stopPropagation(); // Prevent opening Reddit

            // Toggle between full and truncated text
            if (expandButton.textContent === "Show full text") {
              content.textContent = postData.selftext;
              expandButton.textContent = "Show less";
            } else {
              content.textContent = truncateText(postData.selftext, 150);
              expandButton.textContent = "Show full text";
            }
          });

          content.appendChild(document.createElement("br"));
          content.appendChild(expandButton);
        }
      }

      // Only show small images and skip very large ones that might crash the Kindle browser
      if (
        postData.thumbnail &&
        postData.thumbnail !== "self" &&
        postData.thumbnail !== "default" &&
        postData.thumbnail !== "nsfw"
      ) {
        const img = document.createElement("img");
        img.src = postData.thumbnail;
        img.alt = postData.title;
        img.style.maxWidth = "100%";
        content.appendChild(img);
      }

      postElement.appendChild(title);
      postElement.appendChild(info);

      // Only add content div if it has something to show
      if (
        postData.selftext ||
        (postData.thumbnail &&
          postData.thumbnail !== "self" &&
          postData.thumbnail !== "default" &&
          postData.thumbnail !== "nsfw")
      ) {
        postElement.appendChild(content);
      }

      // Add view comments button
      const commentsButton = document.createElement("button");
      commentsButton.textContent = `View ${formatComments(
        postData.num_comments
      )}`;
      commentsButton.style.width = "100%";
      commentsButton.style.marginTop = "10px";

      commentsButton.addEventListener("click", function (event) {
        event.stopPropagation(); // Prevent opening Reddit in browser
        viewingComments = true;
        currentPostId = postData.id;
        currentPostPermalink = postData.permalink;
        fetchComments(postData.permalink);
      });

      postElement.appendChild(commentsButton);

      // Make post clickable to open in reddit
      postElement.addEventListener("click", function () {
        window.location.href = `https://www.reddit.com${postData.permalink}`;
      });
      postElement.style.cursor = "pointer";

      postsContainer.appendChild(postElement);
    });
  }

  // Add new function to display comments
  function displayComments(data) {
    postsContainer.innerHTML = "";

    if (!data || data.length < 2) {
      postsContainer.innerHTML = '<div class="loading">No comments found</div>';
      return;
    }

    // Post data is in first element of the array
    const postData = data[0].data.children[0].data;
    // Comments are in second element
    const comments = data[1].data.children;
    // Store full post text
    fullPostText = postData.selftext;

    // Create back button
    const backButton = document.createElement("button");
    backButton.textContent = "← Back to Posts";
    backButton.style.width = "100%";
    backButton.style.marginBottom = "15px";
    backButton.style.padding = "10px";

    backButton.addEventListener("click", function () {
      viewingComments = false;
      fetchPosts(currentSubreddit);
    });

    postsContainer.appendChild(backButton);

    // Display post title and content
    const postTitle = document.createElement("div");
    postTitle.className = "post-title";
    postTitle.textContent = postData.title;
    postTitle.style.padding = "10px";
    postTitle.style.borderBottom = "1px solid black";
    postsContainer.appendChild(postTitle);

    const postInfo = document.createElement("div");
    postInfo.className = "post-info";
    postInfo.textContent = `u/${postData.author} • ${formatScore(
      postData.score
    )} points`;
    postInfo.style.padding = "5px 10px";
    postsContainer.appendChild(postInfo);

    if (postData.selftext) {
      const postContent = document.createElement("div");
      postContent.className = "post-content";

      // Create a wrapper for the post text
      const postTextContainer = document.createElement("div");
      postTextContainer.textContent = truncateText(postData.selftext, 300);
      postContent.appendChild(postTextContainer);

      // Add expand button if text is truncated
      if (postData.selftext.length > 300) {
        const expandButton = document.createElement("button");
        expandButton.textContent = "Show full text";
        expandButton.style.fontSize = "14px";
        expandButton.style.padding = "5px";
        expandButton.style.marginTop = "10px";
        expandButton.style.backgroundColor = "transparent";
        expandButton.style.border = "1px solid #ccc";
        expandButton.style.width = "100%";

        expandButton.addEventListener("click", function () {
          // Toggle between full and truncated text
          if (expandButton.textContent === "Show full text") {
            postTextContainer.textContent = postData.selftext;
            expandButton.textContent = "Show less";
          } else {
            postTextContainer.textContent = truncateText(
              postData.selftext,
              300
            );
            expandButton.textContent = "Show full text";
          }
        });

        postContent.appendChild(expandButton);
      }

      postContent.style.padding = "10px";
      postContent.style.borderBottom = "1px solid #ccc";
      postsContainer.appendChild(postContent);
    }

    // Comments heading
    const commentsHeading = document.createElement("div");
    commentsHeading.textContent = "Comments";
    commentsHeading.style.fontSize = "18px";
    commentsHeading.style.fontWeight = "bold";
    commentsHeading.style.margin = "15px 0 10px 10px";
    postsContainer.appendChild(commentsHeading);

    // Show comments in threads
    const commentsContainer = document.createElement("div");
    commentsContainer.className = "comments-container";
    postsContainer.appendChild(commentsContainer);

    // Render top-level comments with their replies
    let renderedComments = 0;
    const maxTopLevelComments = 8; // Limit top level comments for performance

    for (let i = 0; i < comments.length; i++) {
      if (renderedComments >= maxTopLevelComments) break;

      // Skip non-comment items (like "more" items)
      if (comments[i].kind !== "t1") continue;

      const commentData = comments[i].data;

      // Skip deleted/removed comments
      if (commentData.body === "[removed]" || commentData.body === "[deleted]")
        continue;

      renderedComments++;

      // Render the comment tree starting from this top level comment
      renderCommentThread(commentData, commentsContainer, 0);
    }

    // Show message if there are more comments and add a button to load more
    if (comments.length > renderedComments) {
      const moreCommentsContainer = document.createElement("div");
      moreCommentsContainer.style.textAlign = "center";
      moreCommentsContainer.style.margin = "15px 0";

      const moreCommentsButton = document.createElement("button");
      moreCommentsButton.textContent = `Load ${
        comments.length - renderedComments
      } more comments...`;
      moreCommentsButton.style.fontSize = "16px";
      moreCommentsButton.style.padding = "10px";
      moreCommentsButton.style.width = "100%";

      moreCommentsButton.addEventListener("click", function () {
        // Replace button with loading indicator
        moreCommentsButton.textContent = "Loading more comments...";
        moreCommentsButton.disabled = true;

        // Render more comments
        const additionalComments = 8; // Number of additional comments to load
        let newRenderedComments = 0;

        for (
          let i = 0;
          i < comments.length && newRenderedComments < additionalComments;
          i++
        ) {
          // Skip already rendered comments
          if (i < renderedComments * 2) continue; // Rough estimate to skip rendered comments

          // Skip non-comment items
          if (comments[i].kind !== "t1") continue;

          const commentData = comments[i].data;

          // Skip deleted/removed comments
          if (
            commentData.body === "[removed]" ||
            commentData.body === "[deleted]"
          )
            continue;

          // Render this comment thread
          renderCommentThread(commentData, commentsContainer, 0);
          newRenderedComments++;
        }

        // Update rendered count
        renderedComments += newRenderedComments;

        // If there are still more comments, update the button
        if (comments.length > renderedComments) {
          moreCommentsButton.textContent = `Load ${
            comments.length - renderedComments
          } more comments...`;
          moreCommentsButton.disabled = false;
        } else {
          // No more comments to load, remove the button
          moreCommentsContainer.remove();
        }
      });

      moreCommentsContainer.appendChild(moreCommentsButton);
      postsContainer.appendChild(moreCommentsContainer);
    }

    // Add link to view on Reddit
    const redditLink = document.createElement("a");
    redditLink.textContent = "View full discussion on Reddit";
    redditLink.href = `https://www.reddit.com${currentPostPermalink}`;
    redditLink.style.display = "block";
    redditLink.style.textAlign = "center";
    redditLink.style.margin = "20px 0";
    redditLink.style.padding = "10px";
    redditLink.style.backgroundColor = "#f0f0f0";
    redditLink.style.borderRadius = "4px";
    postsContainer.appendChild(redditLink);
  }

  // New function to render comment threads recursively
  function renderCommentThread(commentData, container, depth) {
    // Create comment element
    const commentElement = document.createElement("div");
    commentElement.className = "comment";
    commentElement.style.marginBottom = "10px";
    commentElement.style.padding = "10px";
    commentElement.style.border = "1px solid #ccc";
    commentElement.style.backgroundColor = "white";

    // Add indentation based on depth
    if (depth > 0) {
      commentElement.style.marginLeft = Math.min(depth * 15, 45) + "px";
      commentElement.style.borderLeft = "3px solid #ccc";
    }

    // Comment header with author and score
    const commentHeader = document.createElement("div");
    commentHeader.className = "comment-header";
    commentHeader.textContent = `u/${commentData.author} • ${formatScore(
      commentData.score
    )} points`;
    commentHeader.style.fontWeight = "bold";
    commentHeader.style.marginBottom = "5px";
    commentHeader.style.fontSize = depth > 0 ? "14px" : "16px";
    commentElement.appendChild(commentHeader);

    // Comment body with expand capability
    const commentBody = document.createElement("div");
    commentBody.className = "comment-body";

    // Store the full text
    const fullText = commentData.body;
    const truncatedLength = depth > 0 ? 150 : 250;
    const isTruncated = fullText.length > truncatedLength;

    // Create text container
    const textContainer = document.createElement("div");
    textContainer.textContent = isTruncated
      ? truncateText(fullText, truncatedLength)
      : fullText;
    commentBody.appendChild(textContainer);

    // Add expand button if text is truncated
    if (isTruncated) {
      const expandTextButton = document.createElement("button");
      expandTextButton.textContent = "Show more";
      expandTextButton.style.fontSize = "12px";
      expandTextButton.style.padding = "3px 5px";
      expandTextButton.style.marginTop = "5px";
      expandTextButton.style.backgroundColor = "transparent";
      expandTextButton.style.border = "1px solid #ccc";

      expandTextButton.addEventListener("click", function () {
        if (expandTextButton.textContent === "Show more") {
          textContainer.textContent = fullText;
          expandTextButton.textContent = "Show less";
        } else {
          textContainer.textContent = truncateText(fullText, truncatedLength);
          expandTextButton.textContent = "Show more";
        }
      });

      commentBody.appendChild(expandTextButton);
    }

    commentBody.style.fontSize = depth > 0 ? "14px" : "16px";
    commentElement.appendChild(commentBody);

    // Handle replies
    if (
      commentData.replies &&
      commentData.replies.data &&
      commentData.replies.data.children &&
      commentData.replies.data.children.length > 0
    ) {
      const replies = commentData.replies.data.children;
      const validReplies = replies.filter(
        (r) =>
          r.kind === "t1" &&
          r.data.body !== "[removed]" &&
          r.data.body !== "[deleted]"
      );

      if (validReplies.length > 0) {
        // Create collapsible container for replies
        const repliesContainer = document.createElement("div");
        repliesContainer.className = "replies-container";
        repliesContainer.style.display = depth > 1 ? "none" : "block"; // Auto-collapse deep threads

        // Toggle button for expanding/collapsing
        const toggleReplies = document.createElement("button");
        toggleReplies.className = "toggle-replies";
        toggleReplies.textContent =
          depth > 1
            ? `Show ${validReplies.length} ${
                validReplies.length === 1 ? "reply" : "replies"
              }`
            : "Hide replies";
        toggleReplies.style.fontSize = "14px";
        toggleReplies.style.padding = "5px";
        toggleReplies.style.marginTop = "5px";
        toggleReplies.style.backgroundColor = "transparent";
        toggleReplies.style.border = "1px solid #ccc";

        toggleReplies.addEventListener("click", function () {
          const isHidden = repliesContainer.style.display === "none";
          repliesContainer.style.display = isHidden ? "block" : "none";
          toggleReplies.textContent = isHidden
            ? "Hide replies"
            : `Show ${validReplies.length} ${
                validReplies.length === 1 ? "reply" : "replies"
              }`;
        });

        commentElement.appendChild(toggleReplies);
        commentElement.appendChild(repliesContainer);

        // Render replies, but limit depth and number for performance
        const maxReplies = depth === 0 ? 5 : 3;
        const maxDepth = 3;

        if (depth < maxDepth) {
          for (let i = 0; i < Math.min(validReplies.length, maxReplies); i++) {
            renderCommentThread(
              validReplies[i].data,
              repliesContainer,
              depth + 1
            );
          }

          // Show "more replies" message if needed and add load more button
          if (validReplies.length > maxReplies) {
            const moreRepliesContainer = document.createElement("div");
            moreRepliesContainer.style.marginLeft =
              Math.min((depth + 1) * 15, 45) + "px";
            moreRepliesContainer.style.marginTop = "5px";

            const loadMoreRepliesButton = document.createElement("button");
            loadMoreRepliesButton.textContent = `Load ${
              validReplies.length - maxReplies
            } more replies...`;
            loadMoreRepliesButton.style.fontSize = "14px";
            loadMoreRepliesButton.style.padding = "5px";
            loadMoreRepliesButton.style.backgroundColor = "transparent";
            loadMoreRepliesButton.style.border = "1px solid #ccc";

            loadMoreRepliesButton.addEventListener("click", function () {
              // Disable button while loading
              loadMoreRepliesButton.disabled = true;
              loadMoreRepliesButton.textContent = "Loading more replies...";

              // Load more replies (3 at a time)
              const additionalReplies = 3;
              const startIndex = maxReplies; // Start from where we left off
              const endIndex = Math.min(
                startIndex + additionalReplies,
                validReplies.length
              );

              for (let i = startIndex; i < endIndex; i++) {
                renderCommentThread(
                  validReplies[i].data,
                  repliesContainer,
                  depth + 1
                );
              }

              // Update button or remove if no more replies
              if (endIndex < validReplies.length) {
                loadMoreRepliesButton.textContent = `Load ${
                  validReplies.length - endIndex
                } more replies...`;
                loadMoreRepliesButton.disabled = false;
              } else {
                moreRepliesContainer.remove();
              }
            });

            moreRepliesContainer.appendChild(loadMoreRepliesButton);
            repliesContainer.appendChild(moreRepliesContainer);
          }
        } else if (validReplies.length > 0) {
          // At max depth, just show a message about more replies
          const continueThread = document.createElement("div");
          continueThread.textContent = `Thread continues with ${
            validReplies.length
          } more ${validReplies.length === 1 ? "reply" : "replies"}...`;
          continueThread.style.marginLeft =
            Math.min((depth + 1) * 15, 45) + "px";
          continueThread.style.fontStyle = "italic";
          continueThread.style.fontSize = "14px";
          continueThread.style.marginTop = "5px";
          repliesContainer.appendChild(continueThread);
        }
      }
    }

    container.appendChild(commentElement);
  }

  function truncateText(text, maxLength) {
    // Remove markdown for cleaner display
    text = text.replace(/\*\*|__|\*|_|~~|#|>|`/g, "");
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  }

  function formatScore(score) {
    if (score >= 1000) {
      return (score / 1000).toFixed(1) + "k";
    }
    return score;
  }

  function formatComments(comments) {
    if (comments === 1) {
      return "1 comment";
    }
    return comments + " comments";
  }

  // Initial load
  fetchPosts(currentSubreddit);
});
